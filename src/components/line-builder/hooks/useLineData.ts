import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Position, LineData, WizardConfig } from "../types/lineWizard";

export function useLineData(config: WizardConfig) {
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (lineId: string) => {
    setIsLoading(true);
    try {
      // Use optimized RPC function to fetch all data in a single query
      const { data, error } = await supabase
        .rpc('get_line_full_data', {
          p_input_line_id: lineId,
          p_table_name: config.tableName
        });

      if (error) throw error;
      if (!data) throw new Error('Line not found');

      // Parse the returned JSON structure
      const result = data as any;
      const lineData: LineData = result.lineData;
      
      // Transform positions to match expected structure
      const positions: Position[] = (result.positions || []).map((pos: any) => ({
        id: pos.id,
        name: pos.name,
        position_x: pos.position_x,
        position_y: pos.position_y,
        titles: (pos.position_titles || []).map((pt: any) => ({
          id: pt.id,
          title: pt.title as "RLE" | "OP"
        })),
        equipment: (pos.equipment || []).map((eq: any) => ({
          id: eq.id,
          name: eq.name,
          equipment_type: eq.equipment_type || "",
          cameras: (eq.cameras || []).map((cam: any) => ({
            id: cam.id,
            name: cam.name || "Unnamed Camera",
            camera_ip: cam.camera_ip || "",
            camera_type: cam.camera_type,
            lens_type: cam.lens_type,
            light_required: cam.light_required ?? null,
            light_id: cam.light_id || undefined,
            light_notes: cam.light_notes || "",
            plc_attached: cam.plc_attached ?? null,
            plc_master_id: cam.plc_master_id || undefined,
            hmi_required: cam.hmi_required ?? null,
            hmi_master_id: cam.hmi_master_id || undefined,
            hmi_notes: cam.hmi_notes || "",
            relay_outputs: cam.relay_outputs || [],
            horizontal_fov: cam.horizontal_fov || "",
            working_distance: cam.working_distance || "",
            smallest_text: cam.smallest_text || "",
            use_case_ids: cam.use_case_ids || [],
            use_case_description: cam.use_case_description || "",
            attributes: cam.attributes || [],
            product_flow: cam.product_flow || "",
            camera_view_description: cam.camera_view_description || "",
          })),
          iot_devices: (eq.iot_devices || []).map((iot: any) => ({
            id: iot.id,
            name: iot.name,
            hardware_master_id: iot.hardware_master_id,
            receiver_master_id: iot.receiver_master_id || undefined,
          })),
        })),
      }));

      return { lineData, positions };
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (
    lineData: LineData,
    positions: Position[],
    projectId: string,
    editLineId?: string
  ) => {
    const totalCameras = positions.reduce(
      (acc, pos) => acc + pos.equipment.reduce((eqAcc, eq) => eqAcc + eq.cameras.length, 0),
      0
    );
    const totalIotDevices = positions.reduce(
      (acc, pos) => acc + pos.equipment.reduce((eqAcc, eq) => eqAcc + eq.iot_devices.length, 0),
      0
    );

    let lineId = editLineId;

    if (editLineId) {
      // Update existing line
      const { error: lineError } = await supabase
        .from(config.tableName)
        .update({
          line_name: lineData.name,
          min_speed: lineData.min_speed,
          max_speed: lineData.max_speed,
          camera_count: totalCameras,
          iot_device_count: totalIotDevices,
          line_description: lineData.line_description || null,
          product_description: lineData.product_description || null,
          photos_url: lineData.photos_url || null,
          ...(config.tableName === 'solutions_lines' ? {
            number_of_products: lineData.number_of_products || null,
            number_of_artworks: lineData.number_of_artworks || null,
          } : {}),
        })
        .eq('id', editLineId);

      if (lineError) throw lineError;

      // Delete existing data
      const equipmentResponse = await (supabase as any)
        .from('equipment')
        .select('id, cameras(id)')
        .eq(config.projectIdField, editLineId);
      
      const existingEquipment = equipmentResponse.data;

      if (existingEquipment?.length) {
        const equipmentIds = existingEquipment.map((e: any) => e.id);
        const cameraIds = existingEquipment
          .flatMap((e: any) => (e.cameras as any[]) || [])
          .map((c: any) => c.id);

        if (cameraIds.length > 0) {
          await Promise.all([
            supabase.from('camera_measurements').delete().in('camera_id', cameraIds),
            supabase.from('camera_use_cases').delete().in('camera_id', cameraIds),
            supabase.from('camera_attributes').delete().in('camera_id', cameraIds),
            supabase.from('camera_views').delete().in('camera_id', cameraIds),
            supabase.from('camera_plc_outputs').delete().in('camera_id', cameraIds),
          ]);
        }

        await supabase.from('cameras').delete().in('equipment_id', equipmentIds);
        await supabase.from('iot_devices').delete().in('equipment_id', equipmentIds);
      }

      const positionsResponse = await (supabase as any)
        .from('positions')
        .select('id')
        .eq(config.projectIdField, editLineId);
      
      const existingPositions = positionsResponse.data;

      if (existingPositions?.length) {
        const positionIds = existingPositions.map((p: any) => p.id);
        await supabase.from('position_titles').delete().in('position_id', positionIds);
      }

      await (supabase as any).from('equipment').delete().eq(config.projectIdField, editLineId);
      await (supabase as any).from('positions').delete().eq(config.projectIdField, editLineId);
    } else {
      // Create new line
      const insertData: any = {
        line_name: lineData.name,
        min_speed: lineData.min_speed,
        max_speed: lineData.max_speed,
        camera_count: totalCameras,
        iot_device_count: totalIotDevices,
        line_description: lineData.line_description || null,
        product_description: lineData.product_description || null,
        photos_url: lineData.photos_url || null,
      };

      if (config.tableName === 'solutions_lines') {
        insertData.number_of_products = lineData.number_of_products || null;
        insertData.number_of_artworks = lineData.number_of_artworks || null;
      }

      if (config.tableName === 'lines') {
        insertData.project_id = projectId;
      } else {
        insertData.solutions_project_id = projectId;
      }

      const { data: newLine, error: lineError } = await supabase
        .from(config.tableName)
        .insert(insertData)
        .select()
        .single();

      if (lineError) throw lineError;
      lineId = newLine.id;
    }

    // Create positions and equipment
    for (const position of positions) {
      const positionInsert: any = {
        [config.projectIdField]: lineId,
        name: position.name,
        position_x: Math.round(position.position_x),
        position_y: Math.round(position.position_y),
      };
      
      const { data: positionData, error: positionError } = await supabase
        .from('positions')
        .insert(positionInsert)
        .select()
        .single();

      if (positionError) throw positionError;

      // Create position titles
      for (const title of position.titles) {
        await supabase
          .from('position_titles')
          .insert({
            position_id: positionData.id,
            title: title.title,
          });
      }

      // Create equipment
      for (const eq of position.equipment) {
        const equipmentInsert: any = {
          position_id: positionData.id,
          name: eq.name,
          equipment_type: eq.equipment_type || "Machine",
        };

        if (config.tableName === 'lines') {
          equipmentInsert.line_id = lineId;
        } else {
          equipmentInsert.solutions_line_id = lineId;
        }

        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .insert(equipmentInsert)
          .select()
          .single();

        if (equipmentError) throw equipmentError;

        // Create cameras
        for (const camera of eq.cameras) {
          const { data: cameraData, error: cameraError } = await supabase
            .from('cameras')
            .insert({
              equipment_id: equipmentData.id,
              camera_type: camera.camera_type,
              lens_type: camera.lens_type || '',
              mac_address: camera.name || '',
              camera_ip: camera.camera_ip || null,
              light_required: camera.light_required ?? null,
              light_id: camera.light_id || null,
              light_notes: camera.light_notes || null,
              plc_attached: camera.plc_attached ?? null,
              plc_master_id: camera.plc_master_id || null,
              hmi_required: camera.hmi_required ?? null,
              hmi_master_id: camera.hmi_master_id || null,
              hmi_notes: camera.hmi_notes || null,
            })
            .select()
            .single();

          if (cameraError) throw cameraError;

          // Create camera ancillary data
          if (camera.horizontal_fov || camera.working_distance || camera.smallest_text) {
            await supabase.from('camera_measurements').insert({
              camera_id: cameraData.id,
              horizontal_fov: camera.horizontal_fov ? parseFloat(camera.horizontal_fov) : null,
              working_distance: camera.working_distance ? parseFloat(camera.working_distance) : null,
              smallest_text: camera.smallest_text || null,
            });
          }

          if (camera.use_case_ids && camera.use_case_ids.length > 0) {
            // Validate use case IDs exist in vision_use_cases_master
            const { data: validUseCases, error: validateError } = await supabase
              .from('vision_use_cases_master')
              .select('id')
              .in('id', camera.use_case_ids);

            if (validateError) {
              console.error('Error validating use cases:', validateError);
              throw new Error(`Failed to validate use cases: ${validateError.message}`);
            }

            const validIds = new Set(validUseCases?.map(uc => uc.id) || []);
            const filteredUseCaseIds = camera.use_case_ids.filter(id => validIds.has(id));

            if (filteredUseCaseIds.length === 0) {
              console.warn('No valid use case IDs found, skipping use case insert');
            } else {
              const { error: useCaseError } = await supabase
                .from('camera_use_cases')
                .insert(
                  filteredUseCaseIds.map(useCaseId => ({
                    camera_id: cameraData.id,
                    vision_use_case_id: useCaseId,
                    description: camera.use_case_description || null,
                  }))
                );

              if (useCaseError) {
                console.error('Error inserting camera use cases:', useCaseError);
                throw new Error(`Failed to save camera use cases: ${useCaseError.message}`);
              }
            }
          }

          if (camera.attributes && camera.attributes.length > 0) {
            await supabase.from('camera_attributes').insert(
              camera.attributes.map((attr, index) => ({
                camera_id: cameraData.id,
                title: attr.title,
                description: attr.description || null,
                order_index: index,
              }))
            );
          }

          if (camera.product_flow || camera.camera_view_description) {
            await supabase.from('camera_views').insert({
              camera_id: cameraData.id,
              product_flow: camera.product_flow || null,
              description: camera.camera_view_description || null,
            });
          }

          if (camera.relay_outputs && camera.relay_outputs.length > 0) {
            await supabase.from('camera_plc_outputs').insert(
              camera.relay_outputs.map(output => ({
                camera_id: cameraData.id,
                output_number: output.output_number,
                type: output.type,
                custom_name: output.custom_name,
                notes: output.notes,
              }))
            );
          }
        }

        // Create IoT devices
        for (const iot of eq.iot_devices) {
          await supabase.from('iot_devices').insert({
            equipment_id: equipmentData.id,
            name: iot.name,
            hardware_master_id: iot.hardware_master_id,
            receiver_mac_address: iot.receiver_mac_address || '',
            mac_address: '',
          });
        }
      }
    }
  };

  return { loadData, saveData, isLoading };
}
