-- 1. Create contact_companies junction table
CREATE TABLE public.contact_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, company_id)
);

-- 2. Enable RLS
ALTER TABLE public.contact_companies ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY contact_companies_internal_all ON public.contact_companies
  FOR ALL USING (is_internal());

CREATE POLICY contact_companies_external_select ON public.contact_companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contact_projects cp
      JOIN projects p ON p.id = cp.project_id
      WHERE cp.contact_id = contact_companies.contact_id
      AND p.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM contact_solutions_projects csp
      JOIN solutions_projects sp ON sp.id = csp.solutions_project_id
      WHERE csp.contact_id = contact_companies.contact_id
      AND sp.company_id = user_company_id()
    )
  );

-- 4. Migrate existing company_id data to junction table
INSERT INTO public.contact_companies (contact_id, company_id, is_primary)
SELECT id, company_id, true
FROM public.contacts
WHERE company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Add GIN index on emails for fast email lookup
CREATE INDEX idx_contacts_emails_gin ON public.contacts USING GIN (emails);

-- 6. Drop and recreate v_contacts_enriched view with companies array
DROP VIEW IF EXISTS public.v_contacts_enriched;
CREATE VIEW public.v_contacts_enriched AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.notes,
  c.emails,
  c.created_at,
  c.updated_at,
  c.created_by,
  c.company_id,
  c.company,
  -- Aggregate companies from junction table
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', cc.company_id, 'name', co.name, 'is_primary', cc.is_primary) ORDER BY cc.is_primary DESC, co.name)
     FROM public.contact_companies cc
     JOIN public.companies co ON co.id = cc.company_id
     WHERE cc.contact_id = c.id),
    '[]'::jsonb
  ) AS companies,
  -- Aggregate roles
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name))
     FROM public.contact_role_assignments cra
     JOIN public.contact_roles_master r ON r.id = cra.role_id
     WHERE cra.contact_id = c.id),
    '[]'::jsonb
  ) AS roles,
  -- Aggregate implementation projects
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', comp.name, 'type', 'implementation'))
     FROM public.contact_projects cp
     JOIN public.projects p ON p.id = cp.project_id
     JOIN public.companies comp ON comp.id = p.company_id
     WHERE cp.contact_id = c.id),
    '[]'::jsonb
  ) AS impl_projects,
  -- Aggregate solutions projects
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', sp.id, 'name', comp.name, 'type', 'solutions'))
     FROM public.contact_solutions_projects csp
     JOIN public.solutions_projects sp ON sp.id = csp.solutions_project_id
     JOIN public.companies comp ON comp.id = sp.company_id
     WHERE csp.contact_id = c.id),
    '[]'::jsonb
  ) AS sol_projects
FROM public.contacts c;