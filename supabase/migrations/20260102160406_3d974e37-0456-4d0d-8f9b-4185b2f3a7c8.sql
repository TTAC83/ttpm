-- Fix SECURITY DEFINER view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_contacts_enriched;
CREATE VIEW public.v_contacts_enriched WITH (security_invoker = true) AS
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
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', cc.company_id, 'name', co.name, 'is_primary', cc.is_primary) ORDER BY cc.is_primary DESC, co.name)
     FROM public.contact_companies cc
     JOIN public.companies co ON co.id = cc.company_id
     WHERE cc.contact_id = c.id),
    '[]'::jsonb
  ) AS companies,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name))
     FROM public.contact_role_assignments cra
     JOIN public.contact_roles_master r ON r.id = cra.role_id
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