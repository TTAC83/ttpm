-- Add foreign key constraint for project_events.project_id -> projects.id
ALTER TABLE project_events 
ADD CONSTRAINT fk_project_events_project_id 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;