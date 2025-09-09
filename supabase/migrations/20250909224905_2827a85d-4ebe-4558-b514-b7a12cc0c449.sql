-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  status task_status NOT NULL DEFAULT 'Planned',
  assignee UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subtasks
CREATE POLICY "subtasks_internal_all" 
ON public.subtasks 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "subtasks_external_select" 
ON public.subtasks 
FOR SELECT 
USING (
  task_id IN (
    SELECT pt.id 
    FROM project_tasks pt
    JOIN projects pr ON pr.id = pt.project_id
    WHERE pr.company_id = (
      SELECT profiles.company_id 
      FROM profiles 
      WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "subtasks_external_insert" 
ON public.subtasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM project_members pm
    JOIN project_tasks pt ON pt.project_id = pm.project_id
    WHERE pt.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "subtasks_external_update" 
ON public.subtasks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM project_members pm
    JOIN project_tasks pt ON pt.project_id = pm.project_id
    WHERE pt.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_subtasks_updated_at
BEFORE UPDATE ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();