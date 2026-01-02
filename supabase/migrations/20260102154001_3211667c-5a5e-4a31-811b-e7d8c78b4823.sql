-- 1. Add company_id FK column to contacts (nullable for backward compat)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2. Populate company_id from existing company text values
UPDATE public.contacts c
SET company_id = comp.id
FROM public.companies comp
WHERE LOWER(c.company) = LOWER(comp.name)
  AND c.company_id IS NULL;

-- 3. Create function to sync company_id when company text changes
CREATE OR REPLACE FUNCTION public.sync_contact_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If company text is set, look up the company_id
  IF NEW.company IS NOT NULL AND NEW.company <> '' THEN
    SELECT id INTO NEW.company_id
    FROM public.companies
    WHERE LOWER(name) = LOWER(NEW.company)
    LIMIT 1;
  ELSE
    NEW.company_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Create trigger to auto-sync company_id
DROP TRIGGER IF EXISTS trg_sync_contact_company_id ON public.contacts;
CREATE TRIGGER trg_sync_contact_company_id
  BEFORE INSERT OR UPDATE OF company ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contact_company_id();

-- 5. Create enriched contacts view to reduce N+4 queries
CREATE OR REPLACE VIEW public.v_contacts_enriched AS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.company,
  c.company_id,
  c.notes,
  c.emails,
  c.created_at,
  c.updated_at,
  c.created_by,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', crm.id, 'name', crm.name))
     FROM public.contact_role_assignments cra
     JOIN public.contact_roles_master crm ON crm.id = cra.role_id
     WHERE cra.contact_id = c.id),
    '[]'::jsonb
  ) AS roles,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', comp.name, 'type', 'implementation'))
     FROM public.contact_projects cp
     JOIN public.projects p ON p.id = cp.project_id
     JOIN public.companies comp ON comp.id = p.company_id
     WHERE cp.contact_id = c.id),
    '[]'::jsonb
  ) AS impl_projects,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', sp.id, 'name', comp.name, 'type', 'solutions'))
     FROM public.contact_solutions_projects csp
     JOIN public.solutions_projects sp ON sp.id = csp.solutions_project_id
     JOIN public.companies comp ON comp.id = sp.company_id
     WHERE csp.contact_id = c.id),
    '[]'::jsonb
  ) AS sol_projects
FROM public.contacts c;

-- 6. Add index on company_id for better join performance
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);

-- 7. Add index on company text for case-insensitive lookup
CREATE INDEX IF NOT EXISTS idx_contacts_company_lower ON public.contacts(LOWER(company));