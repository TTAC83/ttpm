
-- Update get_line_full_data to include placement fields in camera JSON
CREATE OR REPLACE FUNCTION public.get_line_full_data(p_input_line_id uuid, p_table_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_line JSONB;
  v_positions JSONB;
  v_project_id_field TEXT;
BEGIN
  IF p_table_name = 'lines' THEN
    v_project_id_field := 'line_id';
  ELSE
    v_project_id_field := 'solutions_line_id';
  END IF;

  IF NOT (
    is_internal() 
    OR EXISTS (
      SELECT 1 FROM lines l JOIN projects pr ON pr.id = l.project_id
      WHERE l.id = p_input_line_id AND pr.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = p_input_line_id AND sp.company_id = user_company_id()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_table_name = 'lines' THEN
    SELECT to_jsonb(l.*) INTO v_line FROM lines l WHERE l.id = p_input_line_id;
  ELSE
    SELECT to_jsonb(sl.*) INTO v_line FROM solutions_lines sl WHERE sl.id = p_input_line_id;
  END IF;

  IF v_line IS NULL THEN
    RAISE EXCEPTION 'Line not found';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'name', p.name, 'position_x', p.position_x, 'position_y', p.position_y,
      'position_titles', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pt.id, 'title', pt.title)) FROM position_titles pt WHERE pt.position_id = p.id), '[]'::jsonb),
      'equipment', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', e.id, 'name', e.name, 'equipment_type', e.equipment_type,
          'cameras', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', c.id, 'name', c.mac_address, 'camera_ip', c.camera_ip,
              'camera_type', c.camera_type, 'lens_type', c.lens_type,
              'light_required', c.light_required, 'light_id', c.light_id, 'light_notes', c.light_notes,
              'plc_attached', c.plc_attached, 'plc_master_id', c.plc_master_id,
              'hmi_required', c.hmi_required, 'hmi_master_id', c.hmi_master_id, 'hmi_notes', c.hmi_notes,
              'placement_camera_can_fit', c.placement_camera_can_fit,
              'placement_fabrication_confirmed', c.placement_fabrication_confirmed,
              'placement_fov_suitable', c.placement_fov_suitable,
              'placement_position_description', c.placement_position_description,
              'relay_outputs', COALESCE((
                SELECT jsonb_agg(jsonb_build_object('id', cpo.id, 'output_number', cpo.output_number, 'type', cpo.type, 'custom_name', cpo.custom_name, 'notes', cpo.notes) ORDER BY cpo.output_number)
                FROM camera_plc_outputs cpo WHERE cpo.camera_id = c.id
              ), '[]'::jsonb),
              'horizontal_fov', (SELECT cm.horizontal_fov::text FROM camera_measurements cm WHERE cm.camera_id = c.id LIMIT 1),
              'working_distance', (SELECT cm.working_distance::text FROM camera_measurements cm WHERE cm.camera_id = c.id LIMIT 1),
              'smallest_text', (SELECT cm.smallest_text FROM camera_measurements cm WHERE cm.camera_id = c.id LIMIT 1),
              'use_case_ids', COALESCE((SELECT jsonb_agg(cuc.vision_use_case_id) FROM camera_use_cases cuc WHERE cuc.camera_id = c.id), '[]'::jsonb),
              'use_case_description', (SELECT cuc.description FROM camera_use_cases cuc WHERE cuc.camera_id = c.id LIMIT 1),
              'attributes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ca.id, 'title', ca.title, 'description', ca.description) ORDER BY ca.order_index) FROM camera_attributes ca WHERE ca.camera_id = c.id), '[]'::jsonb),
              'product_flow', (SELECT cv.product_flow FROM camera_views cv WHERE cv.camera_id = c.id LIMIT 1),
              'camera_view_description', (SELECT cv.description FROM camera_views cv WHERE cv.camera_id = c.id LIMIT 1)
            )) FROM cameras c WHERE c.equipment_id = e.id
          ), '[]'::jsonb),
          'iot_devices', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', iot.id, 'name', iot.name, 'hardware_master_id', iot.hardware_master_id, 'receiver_mac_address', iot.receiver_mac_address))
            FROM iot_devices iot WHERE iot.equipment_id = e.id
          ), '[]'::jsonb)
        )) FROM equipment e WHERE e.position_id = p.id
      ), '[]'::jsonb)
    ) ORDER BY p.position_x
  ), '[]'::jsonb)
  INTO v_positions
  FROM positions p
  WHERE (
    (p_table_name = 'lines' AND p.line_id = p_input_line_id)
    OR (p_table_name = 'solutions_lines' AND p.solutions_line_id = p_input_line_id)
  );

  RETURN jsonb_build_object(
    'lineData', jsonb_build_object(
      'name', v_line->>'line_name',
      'min_speed', COALESCE((v_line->>'min_speed')::integer, 0),
      'max_speed', COALESCE((v_line->>'max_speed')::integer, 0),
      'line_description', COALESCE(v_line->>'line_description', ''),
      'product_description', COALESCE(v_line->>'product_description', ''),
      'photos_url', COALESCE(v_line->>'photos_url', ''),
      'number_of_products', (v_line->>'number_of_products')::integer,
      'number_of_artworks', (v_line->>'number_of_artworks')::integer
    ),
    'positions', v_positions
  );
END;
$function$;

-- Update save_camera_full to persist placement fields
CREATE OR REPLACE FUNCTION public.save_camera_full(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_camera_id UUID;
  v_equipment_id UUID;
  v_result JSONB;
BEGIN
  v_camera_id := (p_payload->'camera'->>'id')::UUID;
  v_equipment_id := (p_payload->'camera'->>'equipment_id')::UUID;

  IF v_camera_id IS NOT NULL THEN
    IF NOT (
      is_internal() 
      OR EXISTS (
        SELECT 1 FROM cameras c
        JOIN equipment e ON e.id = c.equipment_id
        LEFT JOIN lines l ON l.id = e.line_id
        LEFT JOIN projects pr ON pr.id = l.project_id
        LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
        LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
        WHERE c.id = v_camera_id 
        AND (pr.company_id = user_company_id() OR sp.company_id = user_company_id())
      )
    ) THEN
      RAISE EXCEPTION 'Access denied to update camera';
    END IF;
  ELSIF v_equipment_id IS NOT NULL THEN
    IF NOT (
      is_internal()
      OR EXISTS (
        SELECT 1 FROM equipment e
        LEFT JOIN lines l ON l.id = e.line_id
        LEFT JOIN projects pr ON pr.id = l.project_id
        LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
        LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
        WHERE e.id = v_equipment_id
        AND (pr.company_id = user_company_id() OR sp.company_id = user_company_id())
      )
    ) THEN
      RAISE EXCEPTION 'Access denied to create camera';
    END IF;
  ELSE
    RAISE EXCEPTION 'Either camera_id or equipment_id required';
  END IF;

  INSERT INTO cameras (
    id, equipment_id, mac_address, camera_type, lens_type, light_required, light_id,
    placement_camera_can_fit, placement_fabrication_confirmed, placement_fov_suitable, placement_position_description
  ) VALUES (
    COALESCE(v_camera_id, gen_random_uuid()),
    v_equipment_id,
    p_payload->'camera'->>'mac_address',
    p_payload->'camera'->>'camera_type',
    p_payload->'camera'->>'lens_type',
    COALESCE((p_payload->'camera'->>'light_required')::boolean, false),
    (p_payload->'camera'->>'light_id')::UUID,
    (p_payload->'camera'->>'placement_camera_can_fit')::boolean,
    (p_payload->'camera'->>'placement_fabrication_confirmed')::boolean,
    (p_payload->'camera'->>'placement_fov_suitable')::boolean,
    p_payload->'camera'->>'placement_position_description'
  )
  ON CONFLICT (id) DO UPDATE SET
    mac_address = EXCLUDED.mac_address,
    camera_type = EXCLUDED.camera_type,
    lens_type = EXCLUDED.lens_type,
    light_required = EXCLUDED.light_required,
    light_id = EXCLUDED.light_id,
    placement_camera_can_fit = EXCLUDED.placement_camera_can_fit,
    placement_fabrication_confirmed = EXCLUDED.placement_fabrication_confirmed,
    placement_fov_suitable = EXCLUDED.placement_fov_suitable,
    placement_position_description = EXCLUDED.placement_position_description,
    updated_at = now()
  RETURNING id INTO v_camera_id;

  IF p_payload->'measurements' IS NOT NULL THEN
    INSERT INTO camera_measurements (
      camera_id, working_distance, horizontal_fov, smallest_text
    ) VALUES (
      v_camera_id,
      (p_payload->'measurements'->>'working_distance')::numeric,
      (p_payload->'measurements'->>'horizontal_fov')::numeric,
      p_payload->'measurements'->>'smallest_text'
    )
    ON CONFLICT (camera_id) DO UPDATE SET
      working_distance = EXCLUDED.working_distance,
      horizontal_fov = EXCLUDED.horizontal_fov,
      smallest_text = EXCLUDED.smallest_text,
      updated_at = now();
  END IF;

  DELETE FROM camera_plc_outputs WHERE camera_id = v_camera_id;
  IF jsonb_array_length(p_payload->'plc_outputs') > 0 THEN
    INSERT INTO camera_plc_outputs (camera_id, output_number, type, custom_name, notes)
    SELECT 
      v_camera_id,
      (value->>'output_number')::integer,
      value->>'type',
      value->>'custom_name',
      value->>'notes'
    FROM jsonb_array_elements(p_payload->'plc_outputs');
  END IF;

  DELETE FROM camera_attributes WHERE camera_id = v_camera_id;
  IF jsonb_array_length(p_payload->'attributes') > 0 THEN
    INSERT INTO camera_attributes (camera_id, title, description, order_index)
    SELECT 
      v_camera_id,
      value->>'title',
      value->>'description',
      COALESCE((value->>'order_index')::integer, 0)
    FROM jsonb_array_elements(p_payload->'attributes');
  END IF;

  DELETE FROM camera_use_cases WHERE camera_id = v_camera_id;
  IF jsonb_array_length(p_payload->'use_cases') > 0 THEN
    INSERT INTO camera_use_cases (camera_id, vision_use_case_id, description)
    SELECT 
      v_camera_id,
      (value->>'vision_use_case_id')::UUID,
      value->>'description'
    FROM jsonb_array_elements(p_payload->'use_cases');
  END IF;

  DELETE FROM camera_views WHERE camera_id = v_camera_id;
  IF jsonb_array_length(p_payload->'views') > 0 THEN
    INSERT INTO camera_views (camera_id, product_flow, description)
    SELECT 
      v_camera_id,
      value->>'product_flow',
      value->>'description'
    FROM jsonb_array_elements(p_payload->'views');
  END IF;

  RETURN get_camera_full(v_camera_id);
END;
$function$;
