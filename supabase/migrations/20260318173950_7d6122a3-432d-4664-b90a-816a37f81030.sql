-- Add RLS policies for camera_use_cases table (currently has none)

CREATE POLICY "camera_use_cases_select" ON public.camera_use_cases
FOR SELECT TO authenticated
USING (
  is_internal()
  OR camera_id IN (
    SELECT c.id FROM cameras c
    JOIN equipment e ON e.id = c.equipment_id
    LEFT JOIN lines l ON l.id = e.line_id
    LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
    LEFT JOIN projects p ON p.id = l.project_id
    LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
    WHERE p.company_id = user_company_id() OR sp.company_id = user_company_id()
  )
);

CREATE POLICY "camera_use_cases_insert" ON public.camera_use_cases
FOR INSERT TO authenticated
WITH CHECK (
  is_internal()
  OR camera_id IN (
    SELECT c.id FROM cameras c
    JOIN equipment e ON e.id = c.equipment_id
    LEFT JOIN lines l ON l.id = e.line_id
    LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
    LEFT JOIN projects p ON p.id = l.project_id
    LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
    WHERE p.company_id = user_company_id() OR sp.company_id = user_company_id()
  )
);

CREATE POLICY "camera_use_cases_delete" ON public.camera_use_cases
FOR DELETE TO authenticated
USING (
  is_internal()
  OR camera_id IN (
    SELECT c.id FROM cameras c
    JOIN equipment e ON e.id = c.equipment_id
    LEFT JOIN lines l ON l.id = e.line_id
    LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
    LEFT JOIN projects p ON p.id = l.project_id
    LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
    WHERE p.company_id = user_company_id() OR sp.company_id = user_company_id()
  )
);