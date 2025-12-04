-- Fix copy_wbs_layout_for_project to use existing wbs_layouts table
-- and avoid referencing non-existent wbs_rows
CREATE OR REPLACE FUNCTION public.copy_wbs_layout_for_project(p_project_id uuid, p_is_solutions boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_solutions THEN
    -- For solutions projects, copy from template layouts where both project_id and solutions_project_id are NULL
    INSERT INTO public.wbs_layouts (solutions_project_id, step_name, pos_x, pos_y, width, height, updated_by)
    SELECT 
      p_project_id,
      step_name,
      pos_x,
      pos_y,
      width,
      height,
      auth.uid()
    FROM public.wbs_layouts
    WHERE project_id IS NULL 
      AND solutions_project_id IS NULL;
  ELSE
    -- For implementation projects, copy from template layouts where both project_id and solutions_project_id are NULL
    INSERT INTO public.wbs_layouts (project_id, step_name, pos_x, pos_y, width, height, updated_by)
    SELECT 
      p_project_id,
      step_name,
      pos_x,
      pos_y,
      width,
      height,
      auth.uid()
    FROM public.wbs_layouts
    WHERE project_id IS NULL 
      AND solutions_project_id IS NULL;
  END IF;
END;
$$;