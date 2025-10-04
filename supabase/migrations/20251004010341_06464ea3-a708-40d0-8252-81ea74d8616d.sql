
-- Enable RLS on subtasks table
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for subtasks
CREATE OR REPLACE FUNCTION public.touch_subtask_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_subtask_updated_at();

-- SELECT policy: internal users or assignees can view subtasks
CREATE POLICY subtasks_select ON public.subtasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.user_id = auth.uid() AND pr.is_internal = true
  )
  OR assignee = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.project_members pm ON pm.project_id = pt.project_id
    WHERE pt.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);

-- INSERT policy: internal users or project members can create subtasks
CREATE POLICY subtasks_insert ON public.subtasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.user_id = auth.uid() AND pr.is_internal = true
  )
  OR EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.project_members pm ON pm.project_id = pt.project_id
    WHERE pt.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);

-- UPDATE policy: internal users or assignees can update subtasks
CREATE POLICY subtasks_update ON public.subtasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.user_id = auth.uid() AND pr.is_internal = true
  )
  OR assignee = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_tasks pt
    JOIN public.project_members pm ON pm.project_id = pt.project_id
    WHERE pt.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
)
WITH CHECK (true);

-- DELETE policy: only internal users can delete subtasks
CREATE POLICY subtasks_delete ON public.subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.user_id = auth.uid() AND pr.is_internal = true
  )
);
