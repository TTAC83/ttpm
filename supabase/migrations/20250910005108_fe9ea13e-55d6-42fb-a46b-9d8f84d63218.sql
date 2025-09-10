-- Add critical_date flag to project_tasks table
ALTER TABLE public.project_tasks 
ADD COLUMN is_critical BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.project_tasks.is_critical IS 'Flag to mark critical tasks that should be highlighted in red on visualizations';