-- Allow product_gaps to be created for solutions projects
ALTER TABLE public.product_gaps
  ALTER COLUMN project_id DROP NOT NULL;

-- Validation trigger: require at least one of project_id or solutions_project_id and set project_type
CREATE OR REPLACE FUNCTION public.product_gaps_validate_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_id IS NULL AND NEW.solutions_project_id IS NULL THEN
    RAISE EXCEPTION 'Either project_id or solutions_project_id must be provided';
  END IF;

  IF NEW.project_type IS NULL THEN
    IF NEW.project_id IS NOT NULL THEN
      NEW.project_type := 'implementation';
    ELSIF NEW.solutions_project_id IS NOT NULL THEN
      NEW.project_type := 'solutions';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_gaps_validate_project_trigger ON public.product_gaps;
CREATE TRIGGER product_gaps_validate_project_trigger
  BEFORE INSERT OR UPDATE ON public.product_gaps
  FOR EACH ROW
  EXECUTE FUNCTION public.product_gaps_validate_project();