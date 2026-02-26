-- Create portal_config_tasks table
CREATE TABLE public.portal_config_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solutions_project_id UUID NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(user_id),
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solutions_project_id, task_key)
);

-- Enable RLS
ALTER TABLE public.portal_config_tasks ENABLE ROW LEVEL SECURITY;

-- Internal users full access
CREATE POLICY "Internal users full access on portal_config_tasks" ON public.portal_config_tasks
  FOR ALL USING (public.is_internal());

-- Updated_at trigger
CREATE TRIGGER set_portal_config_tasks_updated_at
  BEFORE UPDATE ON public.portal_config_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- Index for fast lookups
CREATE INDEX idx_portal_config_tasks_project ON public.portal_config_tasks(solutions_project_id);