
-- Enable RLS on subtasks table (if not already enabled)
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS subtasks_select ON public.subtasks;
DROP POLICY IF EXISTS subtasks_insert ON public.subtasks;
DROP POLICY IF EXISTS subtasks_update ON public.subtasks;
DROP POLICY IF EXISTS subtasks_delete ON public.subtasks;

-- SELECT policy: internal users or project members can view subtasks
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

-- UPDATE policy: internal users or project members can update subtasks
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
