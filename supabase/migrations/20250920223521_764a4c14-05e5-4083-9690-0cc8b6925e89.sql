-- Add unique constraint for step_name and project_id combination
-- First, remove any existing constraint on step_name only
ALTER TABLE public.wbs_layouts DROP CONSTRAINT IF EXISTS wbs_layouts_step_name_key;

-- Add new unique constraint that handles both global templates and project-specific layouts
CREATE UNIQUE INDEX idx_wbs_layouts_step_project ON public.wbs_layouts (step_name, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Update the saveWBSLayout function in the service to handle conflicts properly
-- (This will be done in the code update)