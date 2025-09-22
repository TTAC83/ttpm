-- Add new fields to subtasks table to match master_tasks functionality
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS planned_start_offset_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS planned_end_offset_days integer NOT NULL DEFAULT 1;
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS technology_scope text NOT NULL DEFAULT 'both';
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS assigned_role text;

-- Add check constraint for technology_scope
ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS subtasks_technology_scope_check;
ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_technology_scope_check 
CHECK (technology_scope IN ('both', 'iot', 'vision'));

-- Add check constraint for assigned_role
ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS subtasks_assigned_role_check;
ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_assigned_role_check 
CHECK (assigned_role IN ('implementation_lead', 'ai_iot_engineer', 'project_coordinator', 'technical_project_lead', 'customer_project_lead'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id_position ON public.subtasks(task_id, position);