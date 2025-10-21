-- Update actions validation trigger to support solutions_project_id
CREATE OR REPLACE FUNCTION public.actions_validate_and_set_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If task is provided, derive project references from task
  IF NEW.project_task_id IS NOT NULL THEN
    SELECT pt.project_id, pt.solutions_project_id
    INTO NEW.project_id, NEW.solutions_project_id
    FROM public.project_tasks pt
    WHERE pt.id = NEW.project_task_id;
  END IF;

  -- If task is provided, ensure provided project refs (if any) match the task's project
  IF NEW.project_task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_tasks pt
      WHERE pt.id = NEW.project_task_id
        AND COALESCE(pt.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(NEW.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND COALESCE(pt.solutions_project_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(NEW.solutions_project_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Provided project reference does not match project_task_id''s project';
    END IF;
  END IF;

  -- Ensure at least one reference is present (task, implementation project, or solutions project)
  IF NEW.project_task_id IS NULL AND NEW.project_id IS NULL AND NEW.solutions_project_id IS NULL THEN
    RAISE EXCEPTION 'Either project_task_id, project_id, or solutions_project_id must be provided';
  END IF;

  -- Set project_type if not provided
  IF NEW.project_type IS NULL THEN
    IF NEW.project_id IS NOT NULL THEN
      NEW.project_type := 'implementation';
    ELSIF NEW.solutions_project_id IS NOT NULL THEN
      NEW.project_type := 'solutions';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;