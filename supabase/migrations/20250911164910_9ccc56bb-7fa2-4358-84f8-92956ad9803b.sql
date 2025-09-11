-- Update RLS to allow selecting actions linked directly to a project (no task)
-- Drop existing restrictive SELECT policy and recreate with broader condition
DROP POLICY IF EXISTS "actions_external_select" ON public.actions;

CREATE POLICY "actions_external_select"
ON public.actions
FOR SELECT
USING (
  -- Allow access if action is tied to a task from user's company projects
  (
    actions.project_task_id IN (
      SELECT pt.id
      FROM public.project_tasks pt
      JOIN public.projects pr ON pr.id = pt.project_id
      WHERE pr.company_id = (
        SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  )
  OR
  -- Also allow if action is tied directly to a project from user's company
  (
    actions.project_id IN (
      SELECT pr.id
      FROM public.projects pr
      WHERE pr.company_id = (
        SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  )
);
