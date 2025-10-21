-- Create table to store task date updates for projects
CREATE TABLE project_task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_project_task UNIQUE(project_id, task_title)
);

-- Create indexes for performance
CREATE INDEX idx_project_task_updates_project ON project_task_updates(project_id);
CREATE INDEX idx_project_task_updates_task_title ON project_task_updates(task_title);

-- Enable RLS
ALTER TABLE project_task_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Internal users can view and manage all task updates
CREATE POLICY "Internal users can view all task updates"
  ON project_task_updates
  FOR SELECT
  USING (is_internal());

CREATE POLICY "Internal users can manage task updates"
  ON project_task_updates
  FOR ALL
  USING (is_internal())
  WITH CHECK (is_internal());