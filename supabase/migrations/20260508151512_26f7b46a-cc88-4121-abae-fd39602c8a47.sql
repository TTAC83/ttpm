CREATE OR REPLACE FUNCTION public.validate_project_events_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Standalone events are allowed (both project_id and solutions_project_id NULL)
  -- Set project_type based on which reference is provided (NULL for standalone)
  IF NEW.project_id IS NOT NULL THEN
    NEW.project_type := 'implementation';
  ELSIF NEW.solutions_project_id IS NOT NULL THEN
    NEW.project_type := 'solutions';
  ELSE
    NEW.project_type := NULL;
  END IF;

  RETURN NEW;
END;
$$;