-- Add project_id column to wbs_layouts table to support project-specific layouts
ALTER TABLE public.wbs_layouts ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_wbs_layouts_project_id ON public.wbs_layouts(project_id);

-- Update existing layouts to be templates (project_id = NULL means global template)
-- No changes needed as existing rows will have project_id = NULL by default

-- Add function to copy WBS layout for a new project
CREATE OR REPLACE FUNCTION public.copy_wbs_layout_for_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Copy all existing global WBS layouts (where project_id IS NULL) for the new project
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
  WHERE project_id IS NULL;
END;
$$;

-- Update the projects_after_insert_trigger to also copy WBS layout
CREATE OR REPLACE FUNCTION public.projects_after_insert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
begin
  -- Snapshot project tasks (existing functionality)
  perform public.snapshot_project_tasks(new.id);
  
  -- Copy WBS layout for the new project (new functionality)
  perform public.copy_wbs_layout_for_project(new.id);
  
  return new;
end;
$$;

-- Add RLS policies for project-specific WBS layouts
ALTER TABLE public.wbs_layouts ENABLE ROW LEVEL SECURITY;

-- Policy for reading WBS layouts
CREATE POLICY "wbs_layouts_select_policy" ON public.wbs_layouts
FOR SELECT
USING (
  -- Global templates (project_id IS NULL) are visible to internal users
  (project_id IS NULL AND is_current_user_internal()) 
  OR 
  -- Project-specific layouts are visible to project members
  (project_id IS NOT NULL AND is_project_member(project_id))
);

-- Policy for updating WBS layouts
CREATE POLICY "wbs_layouts_update_policy" ON public.wbs_layouts
FOR UPDATE
USING (
  -- Global templates can be updated by internal users
  (project_id IS NULL AND is_current_user_internal()) 
  OR 
  -- Project-specific layouts can be updated by project members
  (project_id IS NOT NULL AND is_project_member(project_id))
);

-- Policy for inserting WBS layouts
CREATE POLICY "wbs_layouts_insert_policy" ON public.wbs_layouts
FOR INSERT
WITH CHECK (
  -- Global templates can be created by internal users
  (project_id IS NULL AND is_current_user_internal()) 
  OR 
  -- Project-specific layouts can be created by project members
  (project_id IS NOT NULL AND is_project_member(project_id))
);

-- Policy for deleting WBS layouts
CREATE POLICY "wbs_layouts_delete_policy" ON public.wbs_layouts
FOR DELETE
USING (
  -- Global templates can be deleted by internal users
  (project_id IS NULL AND is_current_user_internal()) 
  OR 
  -- Project-specific layouts can be deleted by project members
  (project_id IS NOT NULL AND is_project_member(project_id))
);