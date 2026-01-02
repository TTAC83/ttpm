-- Create function to normalize emails in JSONB array to lowercase
CREATE OR REPLACE FUNCTION public.normalize_contact_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize all emails in the JSONB array to lowercase
  IF NEW.emails IS NOT NULL AND jsonb_array_length(NEW.emails) > 0 THEN
    NEW.emails := (
      SELECT jsonb_agg(
        jsonb_set(elem, '{email}', to_jsonb(lower(elem->>'email')))
      )
      FROM jsonb_array_elements(NEW.emails) AS elem
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to normalize emails before insert or update
DROP TRIGGER IF EXISTS trg_normalize_contact_emails ON public.contacts;
CREATE TRIGGER trg_normalize_contact_emails
  BEFORE INSERT OR UPDATE OF emails ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_contact_emails();

-- Normalize existing emails
UPDATE public.contacts
SET emails = (
  SELECT jsonb_agg(
    jsonb_set(elem, '{email}', to_jsonb(lower(elem->>'email')))
  )
  FROM jsonb_array_elements(emails) AS elem
)
WHERE emails IS NOT NULL AND jsonb_array_length(emails) > 0;