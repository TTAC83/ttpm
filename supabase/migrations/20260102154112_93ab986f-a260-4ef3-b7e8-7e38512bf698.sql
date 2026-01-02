-- Fix the view to use SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.v_contacts_enriched;

CREATE VIEW public.v_contacts_enriched 
WITH (security_invoker = true) AS
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