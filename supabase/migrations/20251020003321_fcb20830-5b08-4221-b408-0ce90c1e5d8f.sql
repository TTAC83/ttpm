-- Create table for camera PLC relay outputs
CREATE TABLE IF NOT EXISTS public.camera_plc_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL,
  output_number INTEGER NOT NULL,
  type TEXT,
  custom_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_camera_plc_outputs_camera_id ON public.camera_plc_outputs(camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_plc_outputs_camera_id_output ON public.camera_plc_outputs(camera_id, output_number);

-- Enable RLS
ALTER TABLE public.camera_plc_outputs ENABLE ROW LEVEL SECURITY;

-- SELECT policy for external users (company scope for both implementation and solutions)
CREATE POLICY camera_plc_outputs_external_select
ON public.camera_plc_outputs
FOR SELECT
USING (
  (camera_id IN (
    SELECT c.id
    FROM public.cameras c
    JOIN public.equipment e ON e.id = c.equipment_id
    JOIN public.lines l ON l.id = e.line_id
    JOIN public.projects pr ON pr.id = l.project_id
    WHERE pr.company_id = user_company_id()
  ))
  OR
  (camera_id IN (
    SELECT c.id
    FROM public.cameras c
    JOIN public.equipment e ON e.id = c.equipment_id
    JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
    JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
    WHERE sp.company_id = user_company_id()
  ))
);

-- INSERT/UPDATE/DELETE policy for project members (or internal)
CREATE POLICY camera_plc_outputs_member_modify
ON public.camera_plc_outputs
FOR ALL
USING (
  is_internal() OR EXISTS (
    SELECT 1
    FROM public.cameras c
    JOIN public.equipment e ON e.id = c.equipment_id
    JOIN public.lines l ON l.id = e.line_id
    JOIN public.project_members pm ON pm.project_id = l.project_id
    WHERE c.id = camera_plc_outputs.camera_id AND pm.user_id = auth.uid()
  )
)
WITH CHECK (
  is_internal() OR EXISTS (
    SELECT 1
    FROM public.cameras c
    JOIN public.equipment e ON e.id = c.equipment_id
    JOIN public.lines l ON l.id = e.line_id
    JOIN public.project_members pm ON pm.project_id = l.project_id
    WHERE c.id = camera_plc_outputs.camera_id AND pm.user_id = auth.uid()
  )
);

-- Internal users full access (mirrors other camera_* tables)
CREATE POLICY camera_plc_outputs_internal_all
ON public.camera_plc_outputs
FOR ALL
USING (is_internal())
WITH CHECK (is_internal());

-- Trigger to maintain updated_at
CREATE TRIGGER trg_camera_plc_outputs_updated_at
BEFORE UPDATE ON public.camera_plc_outputs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();