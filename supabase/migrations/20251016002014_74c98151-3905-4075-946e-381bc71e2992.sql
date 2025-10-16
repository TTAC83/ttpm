-- Add solutions_project_id to wbs_layouts
ALTER TABLE wbs_layouts
ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

-- Make project_id nullable
ALTER TABLE wbs_layouts
ALTER COLUMN project_id DROP NOT NULL;

-- Add check constraint to ensure either project_id or solutions_project_id is set
ALTER TABLE wbs_layouts
ADD CONSTRAINT wbs_layouts_project_check 
CHECK (
  (project_id IS NOT NULL AND solutions_project_id IS NULL) OR
  (project_id IS NULL AND solutions_project_id IS NOT NULL) OR
  (project_id IS NULL AND solutions_project_id IS NULL)
);

-- Update the copy_wbs_layout_for_project function to handle solutions projects
CREATE OR REPLACE FUNCTION public.copy_wbs_layout_for_project(p_project_id uuid, p_is_solutions boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_is_solutions THEN
    -- Copy all existing global WBS layouts for the new solutions project
    INSERT INTO public.wbs_layouts (step_name, pos_x, pos_y, width, height, solutions_project_id, updated_by)
    SELECT 
      step_name, 
      pos_x, 
      pos_y, 
      width, 
      height, 
      p_project_id,
      auth.uid()
    FROM public.wbs_layouts
    WHERE project_id IS NULL AND solutions_project_id IS NULL;
  ELSE
    -- Copy all existing global WBS layouts for the new implementation project
    INSERT INTO public.wbs_layouts (step_name, pos_x, pos_y, width, height, project_id, updated_by)
    SELECT 
      step_name, 
      pos_x, 
      pos_y, 
      width, 
      height, 
      p_project_id,
      auth.uid()
    FROM public.wbs_layouts
    WHERE project_id IS NULL AND solutions_project_id IS NULL;
  END IF;
END;
$function$;

-- Update the solutions_projects_after_insert_trigger to pass the is_solutions flag
CREATE OR REPLACE FUNCTION public.solutions_projects_after_insert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.snapshot_solutions_project_tasks(NEW.id);
  PERFORM public.copy_wbs_layout_for_project(NEW.id, true);
  RETURN NEW;
END;
$function$;