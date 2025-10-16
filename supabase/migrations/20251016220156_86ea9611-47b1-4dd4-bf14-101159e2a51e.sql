-- Add solutions_line_id support to equipment table
ALTER TABLE public.equipment 
  ADD COLUMN solutions_line_id UUID REFERENCES public.solutions_lines(id) ON DELETE CASCADE;

-- Make line_id nullable since equipment can belong to either a regular line OR a solutions line
ALTER TABLE public.equipment 
  ALTER COLUMN line_id DROP NOT NULL;

-- Add constraint to ensure equipment belongs to exactly one type of line
ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_line_type_check 
  CHECK (
    (line_id IS NOT NULL AND solutions_line_id IS NULL) OR
    (line_id IS NULL AND solutions_line_id IS NOT NULL)
  );

-- Update RLS policies to include solutions lines
DROP POLICY IF EXISTS equipment_external_select ON public.equipment;
CREATE POLICY equipment_external_select ON public.equipment
  FOR SELECT
  USING (
    line_id IN (
      SELECT l.id FROM lines l
      JOIN projects pr ON pr.id = l.project_id
      WHERE pr.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    solutions_line_id IN (
      SELECT sl.id FROM solutions_lines sl
      JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sp.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS equipment_external_insert ON public.equipment;
CREATE POLICY equipment_external_insert ON public.equipment
  FOR INSERT
  WITH CHECK (
    (line_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members pm
      JOIN lines l ON l.project_id = pm.project_id
      WHERE l.id = line_id AND pm.user_id = auth.uid()
    ))
    OR
    (solutions_line_id IS NOT NULL AND is_internal())
  );

DROP POLICY IF EXISTS equipment_external_update ON public.equipment;
CREATE POLICY equipment_external_update ON public.equipment
  FOR UPDATE
  USING (
    (line_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members pm
      JOIN lines l ON l.project_id = pm.project_id
      WHERE l.id = line_id AND pm.user_id = auth.uid()
    ))
    OR
    (solutions_line_id IS NOT NULL AND is_internal())
  );

DROP POLICY IF EXISTS equipment_external_delete ON public.equipment;
CREATE POLICY equipment_external_delete ON public.equipment
  FOR DELETE
  USING (
    (line_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members pm
      JOIN lines l ON l.project_id = pm.project_id
      WHERE l.id = line_id AND pm.user_id = auth.uid()
    ))
    OR
    (solutions_line_id IS NOT NULL AND is_internal())
  );