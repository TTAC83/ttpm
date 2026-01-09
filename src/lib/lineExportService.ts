import { supabase } from "@/integrations/supabase/client";

export interface LineExportData {
  version: string;
  exportedAt: string;
  sourceType: "implementation" | "solutions";
  line: {
    line_name: string;
    line_description?: string | null;
    product_description?: string | null;
    photos_url?: string | null;
    min_speed?: number | null;
    max_speed?: number | null;
    camera_count: number;
    iot_device_count: number;
  };
  equipment: Array<{
    name: string;
    position_id: string;
    position_x: number;
    position_y: number;
    equipment_type?: string | null;
    titles: string[];
    camera?: {
      camera_type: string;
      lens_type: string;
      mac_address: string;
      light_required?: boolean | null;
      light_id?: string | null;
      light_notes?: string | null;
      plc_attached?: boolean | null;
      plc_master_id?: string | null;
      hmi_required?: boolean | null;
      hmi_master_id?: string | null;
      hmi_notes?: string | null;
      attributes: Array<{
        title: string;
        description?: string | null;
        order_index: number;
      }>;
      use_cases: Array<{
        vision_use_case_id: string;
        description?: string | null;
      }>;
      view?: {
        product_flow?: string | null;
        description?: string | null;
      } | null;
      measurements?: {
        horizontal_fov?: number | null;
        working_distance?: number | null;
        smallest_text?: string | null;
      } | null;
      plc_outputs: Array<{
        output_number: number;
        type?: string | null;
        custom_name?: string | null;
        notes?: string | null;
      }>;
    } | null;
  }>;
}

export async function exportLine(
  lineId: string,
  sourceType: "implementation" | "solutions"
): Promise<LineExportData> {
  const tableName = sourceType === "implementation" ? "lines" : "solutions_lines";
  const lineIdField = sourceType === "implementation" ? "line_id" : "solutions_line_id";

  // Fetch line data
  const { data: lineData, error: lineError } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", lineId)
    .single();

  if (lineError) throw new Error(`Failed to fetch line: ${lineError.message}`);

  // Fetch equipment for this line
  const { data: equipmentData, error: equipmentError } = await supabase
    .from("equipment")
    .select("*")
    .eq(lineIdField, lineId);

  if (equipmentError) throw new Error(`Failed to fetch equipment: ${equipmentError.message}`);

  const equipmentIds = equipmentData?.map((e) => e.id) || [];

  // Fetch equipment titles
  const { data: titlesData } = equipmentIds.length > 0
    ? await supabase
        .from("equipment_titles")
        .select("*")
        .in("equipment_id", equipmentIds)
    : { data: [] };

  // Fetch cameras for equipment
  const { data: camerasData } = equipmentIds.length > 0
    ? await supabase
        .from("cameras")
        .select("*")
        .in("equipment_id", equipmentIds)
    : { data: [] };

  const cameraIds = camerasData?.map((c) => c.id) || [];

  // Fetch camera-related data in parallel
  const [attributesResult, useCasesResult, viewsResult, measurementsResult, plcOutputsResult] =
    await Promise.all([
      cameraIds.length > 0
        ? supabase.from("camera_attributes").select("*").in("camera_id", cameraIds)
        : { data: [] },
      cameraIds.length > 0
        ? supabase.from("camera_use_cases").select("*").in("camera_id", cameraIds)
        : { data: [] },
      cameraIds.length > 0
        ? supabase.from("camera_views").select("*").in("camera_id", cameraIds)
        : { data: [] },
      cameraIds.length > 0
        ? supabase.from("camera_measurements").select("*").in("camera_id", cameraIds)
        : { data: [] },
      cameraIds.length > 0
        ? supabase.from("camera_plc_outputs").select("*").in("camera_id", cameraIds)
        : { data: [] },
    ]);

  // Build export structure
  const equipment = (equipmentData || []).map((eq) => {
    const camera = camerasData?.find((c) => c.equipment_id === eq.id);
    const titles = titlesData?.filter((t) => t.equipment_id === eq.id).map((t) => t.title) || [];

    let cameraExport = null;
    if (camera) {
      const attributes =
        attributesResult.data?.filter((a) => a.camera_id === camera.id).map((a) => ({
          title: a.title,
          description: a.description,
          order_index: a.order_index,
        })) || [];

      const useCases =
        useCasesResult.data?.filter((u) => u.camera_id === camera.id).map((u) => ({
          vision_use_case_id: u.vision_use_case_id,
          description: u.description,
        })) || [];

      const view = viewsResult.data?.find((v) => v.camera_id === camera.id);
      const measurements = measurementsResult.data?.find((m) => m.camera_id === camera.id);

      const plcOutputs =
        plcOutputsResult.data?.filter((p) => p.camera_id === camera.id).map((p) => ({
          output_number: p.output_number,
          type: p.type,
          custom_name: p.custom_name,
          notes: p.notes,
        })) || [];

      cameraExport = {
        camera_type: camera.camera_type,
        lens_type: camera.lens_type,
        mac_address: camera.mac_address,
        light_required: camera.light_required,
        light_id: camera.light_id,
        light_notes: camera.light_notes,
        plc_attached: camera.plc_attached,
        plc_master_id: camera.plc_master_id,
        hmi_required: camera.hmi_required,
        hmi_master_id: camera.hmi_master_id,
        hmi_notes: camera.hmi_notes,
        attributes,
        use_cases: useCases,
        view: view ? { product_flow: view.product_flow, description: view.description } : null,
        measurements: measurements
          ? {
              horizontal_fov: measurements.horizontal_fov,
              working_distance: measurements.working_distance,
              smallest_text: measurements.smallest_text,
            }
          : null,
        plc_outputs: plcOutputs,
      };
    }

    return {
      name: eq.name,
      position_id: eq.position_id,
      position_x: eq.position_x,
      position_y: eq.position_y,
      equipment_type: eq.equipment_type,
      titles,
      camera: cameraExport,
    };
  });

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    sourceType,
    line: {
      line_name: lineData.line_name,
      line_description: lineData.line_description,
      product_description: lineData.product_description,
      photos_url: lineData.photos_url,
      min_speed: lineData.min_speed,
      max_speed: lineData.max_speed,
      camera_count: lineData.camera_count,
      iot_device_count: lineData.iot_device_count,
    },
    equipment,
  };
}

export async function importLine(
  exportData: LineExportData,
  targetProjectId: string,
  targetType: "implementation" | "solutions"
): Promise<string> {
  const tableName = targetType === "implementation" ? "lines" : "solutions_lines";
  const projectIdField = targetType === "implementation" ? "project_id" : "solutions_project_id";
  const lineIdField = targetType === "implementation" ? "line_id" : "solutions_line_id";

  // Create the line
  const { data: newLine, error: lineError } = await supabase
    .from(tableName)
    .insert({
      [projectIdField]: targetProjectId,
      line_name: exportData.line.line_name,
      line_description: exportData.line.line_description,
      product_description: exportData.line.product_description,
      photos_url: exportData.line.photos_url,
      min_speed: exportData.line.min_speed,
      max_speed: exportData.line.max_speed,
      camera_count: exportData.line.camera_count,
      iot_device_count: exportData.line.iot_device_count,
    } as any)
    .select("id")
    .single();

  if (lineError) throw new Error(`Failed to create line: ${lineError.message}`);

  const newLineId = newLine.id;

  // Create equipment and cameras
  for (const eq of exportData.equipment) {
    const { data: newEquipment, error: eqError } = await supabase
      .from("equipment")
      .insert({
        [lineIdField]: newLineId,
        name: eq.name,
        position_id: crypto.randomUUID(), // New position ID
        position_x: eq.position_x,
        position_y: eq.position_y,
        equipment_type: eq.equipment_type,
      } as any)
      .select("id")
      .single();

    if (eqError) {
      console.error("Failed to create equipment:", eqError);
      continue;
    }

    // Create equipment titles
    if (eq.titles.length > 0) {
      await supabase.from("equipment_titles").insert(
        eq.titles.map((title) => ({
          equipment_id: newEquipment.id,
          title,
        }))
      );
    }

    // Create camera if exists
    if (eq.camera) {
      const { data: newCamera, error: camError } = await supabase
        .from("cameras")
        .insert({
          equipment_id: newEquipment.id,
          camera_type: eq.camera.camera_type,
          lens_type: eq.camera.lens_type,
          mac_address: eq.camera.mac_address + "_imported", // Avoid duplicate MAC
          light_required: eq.camera.light_required,
          light_id: eq.camera.light_id,
          light_notes: eq.camera.light_notes,
          plc_attached: eq.camera.plc_attached,
          plc_master_id: eq.camera.plc_master_id,
          hmi_required: eq.camera.hmi_required,
          hmi_master_id: eq.camera.hmi_master_id,
          hmi_notes: eq.camera.hmi_notes,
        })
        .select("id")
        .single();

      if (camError) {
        console.error("Failed to create camera:", camError);
        continue;
      }

      // Create camera-related data in parallel
      await Promise.all([
        // Attributes
        eq.camera.attributes.length > 0
          ? supabase.from("camera_attributes").insert(
              eq.camera.attributes.map((a) => ({
                camera_id: newCamera.id,
                title: a.title,
                description: a.description,
                order_index: a.order_index,
              }))
            )
          : Promise.resolve(),
        // Use cases
        eq.camera.use_cases.length > 0
          ? supabase.from("camera_use_cases").insert(
              eq.camera.use_cases.map((u) => ({
                camera_id: newCamera.id,
                vision_use_case_id: u.vision_use_case_id,
                description: u.description,
              }))
            )
          : Promise.resolve(),
        // View
        eq.camera.view
          ? supabase.from("camera_views").insert({
              camera_id: newCamera.id,
              product_flow: eq.camera.view.product_flow,
              description: eq.camera.view.description,
            })
          : Promise.resolve(),
        // Measurements
        eq.camera.measurements
          ? supabase.from("camera_measurements").insert({
              camera_id: newCamera.id,
              horizontal_fov: eq.camera.measurements.horizontal_fov,
              working_distance: eq.camera.measurements.working_distance,
              smallest_text: eq.camera.measurements.smallest_text,
            })
          : Promise.resolve(),
        // PLC Outputs
        eq.camera.plc_outputs.length > 0
          ? supabase.from("camera_plc_outputs").insert(
              eq.camera.plc_outputs.map((p) => ({
                camera_id: newCamera.id,
                output_number: p.output_number,
                type: p.type,
                custom_name: p.custom_name,
                notes: p.notes,
              }))
            )
          : Promise.resolve(),
      ]);
    }
  }

  return newLineId;
}

export function downloadLineExport(data: LineExportData, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateLineExport(data: unknown): data is LineExportData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.version === "string" &&
    typeof d.exportedAt === "string" &&
    (d.sourceType === "implementation" || d.sourceType === "solutions") &&
    typeof d.line === "object" &&
    d.line !== null &&
    Array.isArray(d.equipment)
  );
}
