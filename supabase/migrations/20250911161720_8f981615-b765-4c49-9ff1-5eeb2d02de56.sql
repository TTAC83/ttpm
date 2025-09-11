-- Make task optional on actions while preserving project linkage
-- 1) Add project_id and drop NOT NULL on project_task_id
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);

ALTER TABLE public.actions
  ALTER COLUMN project_task_id DROP NOT NULL;

-- 2) Backfill project_id for existing actions from their task
UPDATE public.actions a
SET project_id = pt.project_id
FROM public.project_tasks pt
WHERE a.project_task_id IS NOT NULL
  AND a.project_id IS NULL
  AND pt.id = a.project_task_id;

-- 3) Create validation + auto-fill trigger
CREATE OR REPLACE FUNCTION public.actions_validate_and_set_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If task is provided but project_id is null, derive project_id from task
  IF NEW.project_task_id IS NOT NULL AND NEW.project_id IS NULL THEN
    SELECT project_id INTO NEW.project_id FROM public.project_tasks WHERE id = NEW.project_task_id;
  END IF;

  -- If both provided, ensure they match
  IF NEW.project_task_id IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_tasks pt
      WHERE pt.id = NEW.project_task_id AND pt.project_id = NEW.project_id
    ) THEN
      RAISE EXCEPTION 'project_id does not match project_task_id''s project';
    END IF;
  END IF;

  -- Ensure at least one reference is present
  IF NEW.project_task_id IS NULL AND NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'Either project_task_id or project_id must be provided';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actions_validate_project ON public.actions;
CREATE TRIGGER trg_actions_validate_project
BEFORE INSERT OR UPDATE ON public.actions
FOR EACH ROW
EXECUTE FUNCTION public.actions_validate_and_set_project();

-- 4) Index for filtering by project
CREATE INDEX IF NOT EXISTS idx_actions_project_id ON public.actions(project_id);
