import { supabase } from "@/integrations/supabase/client";

export interface LineGap {
  category: string;
  items: string[];
}

export interface LineCompletenessResult {
  lineId: string;
  isComplete: boolean;
  percentage: number;
  gaps: LineGap[];
}

interface SolutionsLineInput {
  id: string;
  line_name: string;
  min_speed?: number;
  max_speed?: number;
  line_description?: string;
  product_description?: string;
  photos_url?: string;
  number_of_products?: number;
  number_of_artworks?: number;
}

export async function getSolutionTypeMap(solutionsProjectId: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const { data: portal } = await supabase
      .from("solution_portals" as any)
      .select("id")
      .eq("solutions_project_id", solutionsProjectId)
      .maybeSingle();
    if (!portal) return map;

    const { data: factories } = await supabase
      .from("solution_factories" as any)
      .select("id")
      .eq("portal_id", (portal as any).id);
    if (!factories?.length) return map;

    const { data: groups } = await supabase
      .from("factory_groups" as any)
      .select("id")
      .in("factory_id", (factories as any[]).map((f: any) => f.id));
    if (!groups?.length) return map;

    const { data: fgLines } = await supabase
      .from("factory_group_lines" as any)
      .select("name, solution_type")
      .in("group_id", (groups as any[]).map((g: any) => g.id));

    for (const fl of (fgLines as any[] | null) ?? []) {
      map[fl.name] = fl.solution_type || "both";
    }
  } catch (e) {
    console.error("Error fetching solution types:", e);
  }
  return map;
}

export async function checkLineCompleteness(
  line: SolutionsLineInput,
  solutionTypeMap: Record<string, string>
): Promise<LineCompletenessResult> {
  const gaps: LineGap[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Line Information completeness
  const lineInfoGaps: string[] = [];
  const lineFields: [string, any][] = [
    ["Line Name", line.line_name],
    ["Min Speed", line.min_speed],
    ["Max Speed", line.max_speed],
    ["Line Description", line.line_description],
    ["Product Description", line.product_description],
    ["Photos URL", line.photos_url],
    ["Number of Products", line.number_of_products],
    ["Number of Artworks", line.number_of_artworks],
  ];
  for (const [label, value] of lineFields) {
    totalChecks++;
    if (value !== null && value !== undefined && value !== "") {
      passedChecks++;
    } else {
      lineInfoGaps.push(label);
    }
  }
  if (lineInfoGaps.length > 0) {
    gaps.push({ category: "Line Information", items: lineInfoGaps });
  }

  // 2. Load full line data via RPC
  try {
    const { data, error } = await supabase.rpc("get_line_full_data", {
      p_input_line_id: line.id,
      p_table_name: "solutions_lines",
    });

    if (error || !data) {
      return { lineId: line.id, isComplete: false, percentage: 0, gaps: [{ category: "Data", items: ["Unable to load line configuration"] }] };
    }

    const positions: any[] = (data as any).positions || [];
    const solutionType = solutionTypeMap[line.line_name] || "both";

    // 3. At least 1 position
    totalChecks++;
    if (positions.length > 0) {
      passedChecks++;
    } else {
      gaps.push({ category: "Process Flow", items: ["At least 1 position required"] });
    }

    // 4. Check across all positions
    const positionGaps: string[] = [];
    let hasRLE = false;
    let hasOP = false;

    for (const pos of positions) {
      const titles = pos.position_titles || [];
      if (titles.some((t: any) => t.title === "RLE")) hasRLE = true;
      if (titles.some((t: any) => t.title === "OP")) hasOP = true;

      totalChecks++;
      if ((pos.equipment || []).length > 0) {
        passedChecks++;
      } else {
        positionGaps.push(`Position "${pos.name}" needs equipment`);
      }

      for (const eq of pos.equipment || []) {
        const cameras: any[] = eq.cameras || [];
        const iotDevices: any[] = eq.iot_devices || [];

        totalChecks++;
        let deviceOk = true;
        const deviceGaps: string[] = [];

        if (solutionType === "vision") {
          if (cameras.length === 0) {
            deviceOk = false;
            deviceGaps.push(`"${eq.name}" needs a camera (Vision)`);
          }
        } else if (solutionType === "iot") {
          if (iotDevices.length === 0) {
            deviceOk = false;
            deviceGaps.push(`"${eq.name}" needs an IoT device`);
          }
        } else {
          if (cameras.length === 0 && iotDevices.length === 0) {
            deviceOk = false;
            deviceGaps.push(`"${eq.name}" needs a camera or IoT device`);
          }
        }

        if (deviceOk) {
          passedChecks++;
        } else {
          positionGaps.push(...deviceGaps);
        }

        for (const cam of cameras) {
          const camGaps: string[] = [];

          totalChecks++;
          if (cam.name && cam.camera_type) {
            passedChecks++;
          } else {
            if (!cam.name) camGaps.push("Camera Name");
            if (!cam.camera_type) camGaps.push("Camera Model");
          }

          const measurementFields = [
            ["Horizontal FOV", cam.horizontal_fov],
            ["Working Distance", cam.working_distance],
            ["Smallest Text", cam.smallest_text],
          ];
          for (const [label, val] of measurementFields) {
            totalChecks++;
            if (val) {
              passedChecks++;
            } else {
              camGaps.push(label as string);
            }
          }

          totalChecks++;
          if ((cam.use_case_ids || []).length > 0) {
            passedChecks++;
          } else {
            camGaps.push("At least 1 Use Case");
          }

          totalChecks++;
          if ((cam.attributes || []).length > 0) {
            passedChecks++;
          } else {
            camGaps.push("At least 1 Attribute");
          }

          totalChecks++;
          if (cam.product_flow) {
            passedChecks++;
          } else {
            camGaps.push("Product Flow Direction");
          }
          totalChecks++;
          if (cam.camera_view_description) {
            passedChecks++;
          } else {
            camGaps.push("Camera View Description");
          }

          totalChecks++;
          if (cam.light_required === null || cam.light_required === undefined) {
            camGaps.push("Confirm whether lighting is required");
          } else {
            passedChecks++;
            if (cam.light_required) {
              totalChecks++;
              if (cam.light_id) {
                passedChecks++;
              } else {
                camGaps.push("Light Model (required when lighting enabled)");
              }
            }
          }

          totalChecks++;
          if (cam.plc_attached === null || cam.plc_attached === undefined) {
            camGaps.push("Confirm whether PLC is required");
          } else {
            passedChecks++;
            if (cam.plc_attached) {
              totalChecks++;
              if (cam.plc_master_id) {
                passedChecks++;
              } else {
                camGaps.push("PLC Model (required when PLC enabled)");
              }
              totalChecks++;
              if ((cam.relay_outputs || []).length > 0) {
                passedChecks++;
              } else {
                camGaps.push("At least 1 Relay Output (required when PLC enabled)");
              }
            }
          }

          totalChecks++;
          if (cam.hmi_required === null || cam.hmi_required === undefined) {
            camGaps.push("Confirm whether HMI is required");
          } else {
            passedChecks++;
          }

          totalChecks++;
          if (cam.placement_camera_can_fit === true) {
            passedChecks++;
          } else {
            camGaps.push("Confirm camera can fit");
          }

          totalChecks++;
          if (cam.placement_fabrication_confirmed === true) {
            passedChecks++;
          } else {
            camGaps.push("Confirm fabrication/bracketry with customer");
          }

          totalChecks++;
          if (cam.placement_fov_suitable === true) {
            passedChecks++;
          } else {
            camGaps.push("Confirm FOV suitable for all artworks/product types");
          }

          totalChecks++;
          if (cam.placement_position_description) {
            passedChecks++;
          } else {
            camGaps.push("Position Description");
          }

          if (camGaps.length > 0) {
            const cameraDisplayName = cam.name || cam.mac_address || 'Unnamed';
            gaps.push({ category: `Camera "${cameraDisplayName}" on ${eq.name}`, items: camGaps });
          }
        }
      }
    }

    totalChecks += 2;
    if (hasRLE) {
      passedChecks++;
    } else {
      positionGaps.push("RLE title must be assigned to a position");
    }
    if (hasOP) {
      passedChecks++;
    } else {
      positionGaps.push("OP title must be assigned to a position");
    }

    if (positionGaps.length > 0) {
      gaps.push({ category: "Positions & Equipment", items: positionGaps });
    }
  } catch (error) {
    console.error("Error checking line:", error);
    return { lineId: line.id, isComplete: false, percentage: 0, gaps: [{ category: "Error", items: ["Failed to evaluate completeness"] }] };
  }

  const percentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  return {
    lineId: line.id,
    isComplete: percentage === 100,
    percentage,
    gaps,
  };
}

/**
 * Check all lines for a solutions project and return true only if every line is 100% complete.
 */
export async function checkAllLinesComplete(solutionsProjectId: string): Promise<boolean> {
  const { data: lines, error } = await supabase
    .from("solutions_lines")
    .select("id, line_name, min_speed, max_speed, line_description, product_description, photos_url, number_of_products, number_of_artworks")
    .eq("solutions_project_id", solutionsProjectId);

  if (error || !lines || lines.length === 0) return false;

  const solutionTypeMap = await getSolutionTypeMap(solutionsProjectId);

  const results = await Promise.all(
    lines.map((line) => checkLineCompleteness(line, solutionTypeMap))
  );

  return results.every((r) => r.isComplete);
}
