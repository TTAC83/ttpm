-- Drop the old single-parameter version of copy_wbs_layout_for_project
-- This resolves the "function is not unique" error by ensuring only 
-- the two-parameter version exists

DROP FUNCTION IF EXISTS public.copy_wbs_layout_for_project(uuid);

-- Ensure the correct two-parameter version exists
CREATE OR REPLACE FUNCTION public.copy_wbs_layout_for_project(p_project_id uuid, p_is_solutions boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_is_solutions THEN
    -- For solutions projects, copy from wbs_layouts where solutions_project_id is NULL (master/template layouts)
    INSERT INTO wbs_layouts (solutions_project_id, step_id, task_id, x, y, w, h)
    SELECT 
      p_project_id,
      step_id,
      task_id,
      x,
      y,
      w,
      h
    FROM wbs_layouts
    WHERE solutions_project_id IS NULL 
      AND project_id IS NULL;
  ELSE
    -- For implementation projects, copy from wbs_layouts where project_id is NULL (master/template layouts)
    INSERT INTO wbs_layouts (project_id, step_id, task_id, x, y, w, h)
    SELECT 
      p_project_id,
      step_id,
      task_id,
      x,
      y,
      w,
      h
    FROM wbs_layouts
    WHERE project_id IS NULL 
      AND solutions_project_id IS NULL;
  END IF;
END;
$$;