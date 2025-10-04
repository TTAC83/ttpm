-- Drop ALL existing subtasks policies to avoid conflicts
DROP POLICY IF EXISTS subtasks_select ON public.subtasks;
DROP POLICY IF EXISTS subtasks_insert ON public.subtasks;
DROP POLICY IF EXISTS subtasks_update ON public.subtasks;
DROP POLICY IF EXISTS subtasks_delete ON public.subtasks;
DROP POLICY IF EXISTS subtasks_internal_all ON public.subtasks;
DROP POLICY IF EXISTS subtasks_external_select ON public.subtasks;
DROP POLICY IF EXISTS subtasks_external_insert ON public.subtasks;
DROP POLICY IF EXISTS subtasks_external_update ON public.subtasks;

-- Create a security definer function to check if user can access a subtask
CREATE OR REPLACE FUNCTION public.can_access_subtask(subtask_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Internal users can access all
    SELECT 1 FROM public.profiles pr 
    WHERE pr.user_id = auth.uid() AND pr.is_internal = true
  )
  OR EXISTS (
    -- Project members can access subtasks of their project tasks
    SELECT 1 FROM public.project_tasks pt
    JOIN public.project_members pm ON pm.project_id = pt.project_id
    WHERE pt.id = subtask_task_id AND pm.user_id = auth.uid()
  );
$$;

-- SELECT: Internal users, assignees, or project members
CREATE POLICY subtasks_select ON public.subtasks
FOR SELECT
USING (
  can_access_subtask(task_id) OR assignee = auth.uid()
);

-- INSERT: Internal users or project members
CREATE POLICY subtasks_insert ON public.subtasks
FOR INSERT
WITH CHECK (
  can_access_subtask(task_id)
);

-- UPDATE: Internal users, assignees, or project members
CREATE POLICY subtasks_update ON public.subtasks
FOR UPDATE
USING (
  can_access_subtask(task_id) OR assignee = auth.uid()
)
WITH CHECK (
  can_access_subtask(task_id) OR assignee = auth.uid()
);

-- DELETE: Only internal users
CREATE POLICY subtasks_delete ON public.subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr 
    WHERE pr.user_id = auth.uid() AND pr.is_internal = true
  )
);