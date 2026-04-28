
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_project_check;
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_project_xor;

ALTER TABLE public.project_tasks
  ADD CONSTRAINT project_tasks_parent_check CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL AND gospa_plan_id IS NULL)
    OR (project_id IS NULL AND solutions_project_id IS NOT NULL AND gospa_plan_id IS NULL)
    OR (project_id IS NULL AND solutions_project_id IS NULL AND gospa_plan_id IS NOT NULL)
  );
