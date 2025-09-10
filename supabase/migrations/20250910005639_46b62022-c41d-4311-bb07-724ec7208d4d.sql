-- Remove is_critical column from project_tasks
ALTER TABLE public.project_tasks DROP COLUMN IF EXISTS is_critical;

-- Add is_critical column to project_events
ALTER TABLE public.project_events ADD COLUMN is_critical boolean NOT NULL DEFAULT false;