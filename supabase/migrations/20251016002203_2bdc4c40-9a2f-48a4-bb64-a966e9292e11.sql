-- Drop the old unique constraint
DROP INDEX IF EXISTS idx_wbs_layouts_step_project;

-- Create a unique index for implementation projects
CREATE UNIQUE INDEX idx_wbs_layouts_step_impl_project 
ON wbs_layouts (step_name, project_id) 
WHERE project_id IS NOT NULL;

-- Create a unique index for solutions projects
CREATE UNIQUE INDEX idx_wbs_layouts_step_solutions_project 
ON wbs_layouts (step_name, solutions_project_id) 
WHERE solutions_project_id IS NOT NULL;

-- Create a unique index for global layouts (neither project type)
CREATE UNIQUE INDEX idx_wbs_layouts_step_global 
ON wbs_layouts (step_name) 
WHERE project_id IS NULL AND solutions_project_id IS NULL;