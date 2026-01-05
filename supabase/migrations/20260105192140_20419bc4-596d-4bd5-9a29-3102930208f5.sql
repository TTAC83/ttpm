-- Drop and recreate the view to include archived_at and archived_by columns
DROP VIEW IF EXISTS v_contacts_enriched;

CREATE VIEW v_contacts_enriched AS
SELECT 
    id,
    name,
    phone,
    notes,
    emails,
    created_at,
    updated_at,
    created_by,
    company_id,
    company,
    archived_at,
    archived_by,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', cc.company_id, 'name', co.name, 'is_primary', cc.is_primary) ORDER BY cc.is_primary DESC, co.name) AS jsonb_agg
           FROM (contact_companies cc
             JOIN companies co ON ((co.id = cc.company_id)))
          WHERE (cc.contact_id = c.id)), '[]'::jsonb) AS companies,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)) AS jsonb_agg
           FROM (contact_role_assignments cra
             JOIN contact_roles_master r ON ((r.id = cra.role_id)))
          WHERE (cra.contact_id = c.id)), '[]'::jsonb) AS roles,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', comp.name, 'type', 'implementation')) AS jsonb_agg
           FROM ((contact_projects cp
             JOIN projects p ON ((p.id = cp.project_id)))
             JOIN companies comp ON ((comp.id = p.company_id)))
          WHERE (cp.contact_id = c.id)), '[]'::jsonb) AS impl_projects,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', sp.id, 'name', comp.name, 'type', 'solutions')) AS jsonb_agg
           FROM ((contact_solutions_projects csp
             JOIN solutions_projects sp ON ((sp.id = csp.solutions_project_id)))
             JOIN companies comp ON ((comp.id = sp.company_id)))
          WHERE (csp.contact_id = c.id)), '[]'::jsonb) AS sol_projects
   FROM contacts c;