-- Add unique constraint on camera_measurements for easier upserts
ALTER TABLE public.camera_measurements DROP CONSTRAINT IF EXISTS camera_measurements_camera_id_key;
ALTER TABLE public.camera_measurements ADD CONSTRAINT camera_measurements_camera_id_key UNIQUE (camera_id);

-- Function to get complete camera data with all relationships
CREATE OR REPLACE FUNCTION public.get_camera_full(p_camera_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camera JSONB;
  v_measurements JSONB;
  v_plc_outputs JSONB;
  v_attributes JSONB;
  v_use_cases JSONB;
  v_views JSONB;
BEGIN
  -- Check access: user must be internal OR camera belongs to their company's project
  IF NOT (
    is_internal() 
    OR EXISTS (
      SELECT 1 FROM cameras c
      JOIN equipment e ON e.id = c.equipment_id
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN projects pr ON pr.id = l.project_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE c.id = p_camera_id 
      AND (pr.company_id = user_company_id() OR sp.company_id = user_company_id())
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get base camera data
  SELECT to_jsonb(c.*) INTO v_camera
  FROM cameras c
  WHERE c.id = p_camera_id;

  IF v_camera IS NULL THEN
    RAISE EXCEPTION 'Camera not found';
  END IF;

  -- Get measurements
  SELECT to_jsonb(m.*) INTO v_measurements
  FROM camera_measurements m
  WHERE m.camera_id = p_camera_id;

  -- Get PLC outputs
  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.output_number), '[]'::jsonb) INTO v_plc_outputs
  FROM camera_plc_outputs o
  WHERE o.camera_id = p_camera_id;

  -- Get attributes
  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.order_index), '[]'::jsonb) INTO v_attributes
  FROM camera_attributes a
  WHERE a.camera_id = p_camera_id;

  -- Get use cases
  SELECT COALESCE(jsonb_agg(to_jsonb(u.*)), '[]'::jsonb) INTO v_use_cases
  FROM camera_use_cases u
  WHERE u.camera_id = p_camera_id;

  -- Get views
  SELECT COALESCE(jsonb_agg(to_jsonb(v.*)), '[]'::jsonb) INTO v_views
  FROM camera_views v
  WHERE v.camera_id = p_camera_id;

  -- Combine all data
  RETURN jsonb_build_object(
    'camera', v_camera,
    'measurements', v_measurements,
    'plc_outputs', v_plc_outputs,
    'attributes', v_attributes,
    'use_cases', v_use_cases,
    'views', v_views
  );
END;
$$;

-- Function to save complete camera data atomically
CREATE OR REPLACE FUNCTION public.save_camera_full(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camera_id UUID;
  v_equipment_id UUID;
  v_result JSONB;
BEGIN
  -- Extract camera_id
  v_camera_id := (p_payload->'camera'->>'id')::UUID;
  v_equipment_id := (p_payload->'camera'->>'equipment_id')::UUID;

  -- Check access
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
    -- New camera - check equipment access
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

  -- Begin transaction (implicit in function)
  
  -- Upsert camera
  INSERT INTO cameras (
    id, equipment_id, mac_address, camera_type, lens_type, light_required, light_id
  ) VALUES (
    COALESCE(v_camera_id, gen_random_uuid()),
    v_equipment_id,
    p_payload->'camera'->>'mac_address',
    p_payload->'camera'->>'camera_type',
    p_payload->'camera'->>'lens_type',
    COALESCE((p_payload->'camera'->>'light_required')::boolean, false),
    (p_payload->'camera'->>'light_id')::UUID
  )
  ON CONFLICT (id) DO UPDATE SET
    mac_address = EXCLUDED.mac_address,
    camera_type = EXCLUDED.camera_type,
    lens_type = EXCLUDED.lens_type,
    light_required = EXCLUDED.light_required,
    light_id = EXCLUDED.light_id,
    updated_at = now()
  RETURNING id INTO v_camera_id;

  -- Upsert measurements
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

  -- Replace PLC outputs
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

  -- Replace attributes
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

  -- Replace use cases
  DELETE FROM camera_use_cases WHERE camera_id = v_camera_id;
  IF jsonb_array_length(p_payload->'use_cases') > 0 THEN
    INSERT INTO camera_use_cases (camera_id, vision_use_case_id, description)
    SELECT 
      v_camera_id,
      (value->>'vision_use_case_id')::UUID,
      value->>'description'
    FROM jsonb_array_elements(p_payload->'use_cases');
  END IF;

  -- Replace views
  DELETE FROM camera_views WHERE camera_id = v_camera_id;
  IF jsonb_array_length(p_payload->'views') > 0 THEN
    INSERT INTO camera_views (camera_id, product_flow, description)
    SELECT 
      v_camera_id,
      value->>'product_flow',
      value->>'description'
    FROM jsonb_array_elements(p_payload->'views');
  END IF;

  -- Return full camera data
  RETURN get_camera_full(v_camera_id);
END;
$$;