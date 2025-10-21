-- Make project_events support both implementation and solutions projects
ALTER TABLE project_events 
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS solutions_project_id uuid REFERENCES solutions_projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_type project_type DEFAULT 'implementation';

-- Add validation trigger to ensure at least one project reference exists
CREATE OR REPLACE FUNCTION validate_project_events_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure at least one project reference is present
  IF NEW.project_id IS NULL AND NEW.solutions_project_id IS NULL THEN
    RAISE EXCEPTION 'Either project_id or solutions_project_id must be provided';
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
$$;

DROP TRIGGER IF EXISTS validate_project_events_project_trigger ON project_events;
CREATE TRIGGER validate_project_events_project_trigger
  BEFORE INSERT OR UPDATE ON project_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_project_events_project();

-- Add RLS policies for solutions project events
CREATE POLICY "project_events_solutions_external_select"
  ON project_events FOR SELECT
  USING (
    solutions_project_id IN (
      SELECT sp.id FROM solutions_projects sp
      WHERE sp.company_id = user_company_id()
    )
  );

CREATE POLICY "project_events_solutions_internal_all"
  ON project_events FOR ALL
  USING (solutions_project_id IS NOT NULL AND is_internal())
  WITH CHECK (solutions_project_id IS NOT NULL AND is_internal());