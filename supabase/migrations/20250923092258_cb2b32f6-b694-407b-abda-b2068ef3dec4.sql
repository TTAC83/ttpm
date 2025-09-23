-- Update v_impl_companies to only show companies with implementation domain projects
DROP VIEW IF EXISTS public.v_impl_companies;

CREATE VIEW public.v_impl_companies AS
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    c.is_internal,
    count(p.id) AS project_count,
    count(
        CASE
            WHEN (p.domain IN ('IoT', 'Vision', 'Hybrid')) THEN 1
            ELSE NULL::integer
        END) AS active_projects,
    min(p.contract_signed_date) AS first_project_date,
    max(p.contract_signed_date) AS latest_contract_date
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
WHERE c.is_internal = false
  AND EXISTS (
    SELECT 1 FROM projects impl_p 
    WHERE impl_p.company_id = c.id 
    AND impl_p.domain IN ('IoT', 'Vision', 'Hybrid')
  )
GROUP BY c.id, c.name, c.is_internal
ORDER BY c.name;