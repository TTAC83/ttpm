-- Fix v_impl_companies view to alias name as company_name for application compatibility
DROP VIEW IF EXISTS public.v_impl_companies;

CREATE VIEW public.v_impl_companies AS 
SELECT c.id AS company_id,
    c.name AS company_name,  -- Alias name as company_name for app compatibility
    c.is_internal,
    COUNT(p.id) AS project_count,
    COUNT(CASE WHEN p.domain IS NOT NULL THEN 1 END) AS active_projects,
    MIN(p.contract_signed_date) AS first_project_date,
    MAX(p.contract_signed_date) AS latest_contract_date
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
WHERE c.is_internal = false
GROUP BY c.id, c.name, c.is_internal;