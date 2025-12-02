-- Fix copy_wbs_layout_for_project to use correct column names
-- The wbs_layouts table uses: step_name, pos_x, pos_y, width, height
-- NOT: step_id, task_id, x, y, w, h

CREATE OR REPLACE FUNCTION public.copy_wbs_layout_for_project(p_project_id uuid, p_is_solutions boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF p_is_solutions THEN
    -- For solutions projects, copy from wbs_layouts where solutions_project_id is NULL (master/template layouts)
    INSERT INTO wbs_layouts (solutions_project_id, step_name, pos_x, pos_y, width, height, updated_by)
    SELECT 
      p_project_id,
      step_name,
      pos_x,
      pos_y,
      width,
      height,
      auth.uid()
    FROM wbs_layouts
    WHERE solutions_project_id IS NULL 
      AND project_id IS NULL;
  ELSE
    -- For implementation projects, copy from wbs_layouts where project_id is NULL (master/template layouts)
    INSERT INTO wbs_layouts (project_id, step_name, pos_x, pos_y, width, height, updated_by)
    SELECT 
      p_project_id,
      step_name,
      pos_x,
      pos_y,
      width,
      height,
      auth.uid()
    FROM wbs_layouts
    WHERE project_id IS NULL 
      AND solutions_project_id IS NULL;
  END IF;
END;
$$;