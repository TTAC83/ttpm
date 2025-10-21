import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Position, LineData, WizardConfig } from "../types/lineWizard";

export function useLineData(config: WizardConfig) {
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (lineId: string) => {
    setIsLoading(true);
    try {
      // Load line data
      const { data: existingLine, error: lineError } = await supabase
        .from(config.tableName)
        .select('*')
        .eq('id', lineId)
        .single();

      if (lineError) throw lineError;

      const lineData: LineData = {
        name: existingLine.line_name,
        min_speed: existingLine.min_speed || 0,
        max_speed: existingLine.max_speed || 0,
        line_description: existingLine.line_description || "",
        product_description: existingLine.product_description || "",
        photos_url: existingLine.photos_url || "",
      };

      // Load positions with titles
      const { data: positionsData, error: positionsError }: any = await supabase
        .from('positions')
        .select('*, position_titles(id, title)')
        .eq(config.projectIdField, lineId)
        .order('position_x');

      if (positionsError) throw positionsError;

      // Load equipment with cameras and IoT devices for each position
      const positions: Position[] = await Promise.all(
        (positionsData || []).map(async (pos: any) => {
          const { data: equipmentData }: any = await supabase
            .from('equipment')
            .select('*, cameras(*), iot_devices(*)')
            .eq('position_id', pos.id);

          const equipmentWithFullData = await Promise.all(
            (equipmentData || []).map(async (eq: any) => {
              const camerasWithData = await Promise.all(
                (eq.cameras || []).map(async (cam: any) => {
                  const [outputs, measurements, useCases, attributes, views] = await Promise.all([
                    supabase.from('camera_plc_outputs')
                      .select('id, output_number, type, custom_name, notes')
                      .eq('camera_id', cam.id)
                      .order('output_number'),
                    supabase.from('camera_measurements')
                      .select('*')
                      .eq('camera_id', cam.id)
                      .maybeSingle(),
                    supabase.from('camera_use_cases')
                      .select('vision_use_case_id, description')
                      .eq('camera_id', cam.id),
                    supabase.from('camera_attributes')
                      .select('*')
                      .eq('camera_id', cam.id)
                      .order('order_index'),
                    supabase.from('camera_views')
                      .select('*')
                      .eq('camera_id', cam.id)
                      .maybeSingle(),
                  ]);

                  return {
                    id: cam.id,
                    name: cam.mac_address || "Unnamed Camera",
                    camera_type: cam.camera_type,
                    lens_type: cam.lens_type,
                    light_required: cam.light_required || false,
                    light_id: cam.light_id || undefined,
                    plc_attached: cam.plc_attached || false,
                    plc_master_id: cam.plc_master_id || undefined,
                    hmi_required: cam.hmi_required || false,
                    hmi_master_id: cam.hmi_master_id || undefined,
                    relay_outputs: outputs.data || [],
                    horizontal_fov: measurements.data?.horizontal_fov?.toString() || "",
                    working_distance: measurements.data?.working_distance?.toString() || "",
                    smallest_text: measurements.data?.smallest_text || "",
                    use_case_ids: useCases.data?.map((uc: any) => uc.vision_use_case_id) || [],
                    use_case_description: useCases.data?.[0]?.description || "",
                    attributes: attributes.data?.map((attr: any) => ({
                      id: attr.id,
                      title: attr.title,
                      description: attr.description || ""
                    })) || [],
                    product_flow: views.data?.product_flow || "",
                    camera_view_description: views.data?.description || "",
                  };
                })
              );

              return {
                id: eq.id,
                name: eq.name,
                equipment_type: eq.equipment_type || "",
                cameras: camerasWithData,
                iot_devices: (eq.iot_devices || []).map((iot: any) => ({
                  id: iot.id,
                  name: iot.name,
                  hardware_master_id: iot.hardware_master_id,
                  receiver_master_id: iot.receiver_master_id || undefined,
                })),
              };
            })
          );

          return {
            id: pos.id,
            name: pos.name,
            position_x: pos.position_x,
            position_y: pos.position_y,
            titles: (pos.position_titles || []).map((pt: any) => ({
              id: pt.id,
              title: pt.title as "RLE" | "OP"
            })),
            equipment: equipmentWithFullData,
          };
        })
      );

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
        })
        .eq('id', editLineId);

      if (lineError) throw lineError;

      // Delete existing data
      const { data: existingEquipment } = await supabase
        .from('equipment')
        .select('id, cameras(id)')
        .eq(config.projectIdField, editLineId);

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

      const { data: existingPositions } = await supabase
        .from('positions')
        .select('id')
        .eq(config.projectIdField, editLineId);

      if (existingPositions?.length) {
        const positionIds = existingPositions.map((p: any) => p.id);
        await supabase.from('position_titles').delete().in('position_id', positionIds);
      }

      await supabase.from('equipment').delete().eq(config.projectIdField, editLineId);
      await supabase.from('positions').delete().eq(config.projectIdField, editLineId);
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
      };

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
              lens_type: camera.lens_type,
              mac_address: camera.name || '',
              light_required: camera.light_required || false,
              light_id: camera.light_id || null,
              plc_attached: camera.plc_attached || false,
              plc_master_id: camera.plc_master_id || null,
              hmi_required: camera.hmi_required || false,
              hmi_master_id: camera.hmi_master_id || null,
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
            await supabase.from('camera_use_cases').insert(
              camera.use_case_ids.map(useCaseId => ({
                camera_id: cameraData.id,
                vision_use_case_id: useCaseId,
                description: camera.use_case_description || null,
              }))
            );
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
            receiver_master_id: iot.receiver_master_id || null,
            mac_address: '',
            receiver_mac_address: '',
          });
        }
      }
    }
  };

  return { loadData, saveData, isLoading };
}
