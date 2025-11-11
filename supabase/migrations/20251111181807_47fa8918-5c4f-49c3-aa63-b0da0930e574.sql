-- Fix get_line_full_data to use receiver_mac_address instead of receiver_master_id
CREATE OR REPLACE FUNCTION public.get_line_full_data(
  p_line_id UUID,
  p_table_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_line JSONB;
  v_positions JSONB;
  v_project_id_field TEXT;
BEGIN
  -- Determine the correct foreign key field name based on table
  IF p_table_name = 'lines' THEN
    v_project_id_field := 'line_id';
  ELSE
    v_project_id_field := 'solutions_line_id';
  END IF;

  -- Check access: user must be internal OR line belongs to their company's project
  IF NOT (
    is_internal() 
    OR EXISTS (
      SELECT 1 
      FROM lines l
      JOIN projects pr ON pr.id = l.project_id
      WHERE l.id = p_line_id AND pr.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 
      FROM solutions_lines sl
      JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = p_line_id AND sp.company_id = user_company_id()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get line data
  IF p_table_name = 'lines' THEN
    SELECT to_jsonb(l.*) INTO v_line
    FROM lines l
    WHERE l.id = p_line_id;
  ELSE
    SELECT to_jsonb(sl.*) INTO v_line
    FROM solutions_lines sl
    WHERE sl.id = p_line_id;
  END IF;

  IF v_line IS NULL THEN
    RAISE EXCEPTION 'Line not found';
  END IF;

  -- Build complete positions array with equipment and cameras
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'position_x', p.position_x,
      'position_y', p.position_y,
      'position_titles', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('id', pt.id, 'title', pt.title))
          FROM position_titles pt
          WHERE pt.position_id = p.id
        ),
        '[]'::jsonb
      ),
      'equipment', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'name', e.name,
              'equipment_type', e.equipment_type,
              'cameras', COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', c.id,
                      'name', c.mac_address,
                      'camera_type', c.camera_type,
                      'lens_type', c.lens_type,
                      'light_required', c.light_required,
                      'light_id', c.light_id,
                      'light_notes', c.light_notes,
                      'plc_attached', c.plc_attached,
                      'plc_master_id', c.plc_master_id,
                      'hmi_required', c.hmi_required,
                      'hmi_master_id', c.hmi_master_id,
                      'hmi_notes', c.hmi_notes,
                      'relay_outputs', COALESCE(
                        (
                          SELECT jsonb_agg(
                            jsonb_build_object(
                              'id', cpo.id,
                              'output_number', cpo.output_number,
                              'type', cpo.type,
                              'custom_name', cpo.custom_name,
                              'notes', cpo.notes
                            ) ORDER BY cpo.output_number
                          )
                          FROM camera_plc_outputs cpo
                          WHERE cpo.camera_id = c.id
                        ),
                        '[]'::jsonb
                      ),
                      'horizontal_fov', (
                        SELECT cm.horizontal_fov::text
                        FROM camera_measurements cm
                        WHERE cm.camera_id = c.id
                        LIMIT 1
                      ),
                      'working_distance', (
                        SELECT cm.working_distance::text
                        FROM camera_measurements cm
                        WHERE cm.camera_id = c.id
                        LIMIT 1
                      ),
                      'smallest_text', (
                        SELECT cm.smallest_text
                        FROM camera_measurements cm
                        WHERE cm.camera_id = c.id
                        LIMIT 1
                      ),
                      'use_case_ids', COALESCE(
                        (
                          SELECT jsonb_agg(cuc.vision_use_case_id)
                          FROM camera_use_cases cuc
                          WHERE cuc.camera_id = c.id
                        ),
                        '[]'::jsonb
                      ),
                      'use_case_description', (
                        SELECT cuc.description
                        FROM camera_use_cases cuc
                        WHERE cuc.camera_id = c.id
                        LIMIT 1
                      ),
                      'attributes', COALESCE(
                        (
                          SELECT jsonb_agg(
                            jsonb_build_object(
                              'id', ca.id,
                              'title', ca.title,
                              'description', ca.description
                            ) ORDER BY ca.order_index
                          )
                          FROM camera_attributes ca
                          WHERE ca.camera_id = c.id
                        ),
                        '[]'::jsonb
                      ),
                      'product_flow', (
                        SELECT cv.product_flow
                        FROM camera_views cv
                        WHERE cv.camera_id = c.id
                        LIMIT 1
                      ),
                      'camera_view_description', (
                        SELECT cv.description
                        FROM camera_views cv
                        WHERE cv.camera_id = c.id
                        LIMIT 1
                      )
                    )
                  )
                  FROM cameras c
                  WHERE c.equipment_id = e.id
                ),
                '[]'::jsonb
              ),
              'iot_devices', COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', iot.id,
                      'name', iot.name,
                      'hardware_master_id', iot.hardware_master_id,
                      'receiver_mac_address', iot.receiver_mac_address
                    )
                  )
                  FROM iot_devices iot
                  WHERE iot.equipment_id = e.id
                ),
                '[]'::jsonb
              )
            )
          )
          FROM equipment e
          WHERE e.position_id = p.id
        ),
        '[]'::jsonb
      )
    ) ORDER BY p.position_x
  ), '[]'::jsonb)
  INTO v_positions
  FROM positions p
  WHERE (
    (p_table_name = 'lines' AND p.line_id = p_line_id)
    OR
    (p_table_name = 'solutions_lines' AND p.solutions_line_id = p_line_id)
  );

  -- Return combined result
  RETURN jsonb_build_object(
    'lineData', jsonb_build_object(
      'name', v_line->>'line_name',
      'min_speed', COALESCE((v_line->>'min_speed')::integer, 0),
      'max_speed', COALESCE((v_line->>'max_speed')::integer, 0),
      'line_description', COALESCE(v_line->>'line_description', ''),
      'product_description', COALESCE(v_line->>'product_description', ''),
      'photos_url', COALESCE(v_line->>'photos_url', '')
    ),
    'positions', v_positions
  );
END;
$function$;