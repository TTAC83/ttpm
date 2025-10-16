-- Make project_id nullable since we now support either project_id or solutions_project_id
ALTER TABLE project_tasks 
ALTER COLUMN project_id DROP NOT NULL;

-- Drop the old check constraint if it exists
ALTER TABLE project_tasks
DROP CONSTRAINT IF EXISTS project_tasks_project_check;

-- Add updated check constraint
ALTER TABLE project_tasks
ADD CONSTRAINT project_tasks_project_check 
CHECK (
  (project_id IS NOT NULL AND solutions_project_id IS NULL) OR
  (project_id IS NULL AND solutions_project_id IS NOT NULL)
);