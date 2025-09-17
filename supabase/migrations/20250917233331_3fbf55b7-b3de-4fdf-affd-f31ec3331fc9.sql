-- Update v_impl_open_blockers view to include reason_code and is_critical
CREATE OR REPLACE VIEW public.v_impl_open_blockers AS
SELECT
  b.id,
  b.project_id,
  p.name as project_name,
  c.name as customer_name,
  b.title,
  b.estimated_complete_date,
  b.raised_at,
  (current_date - b.raised_at::date) as age_days,
  CASE
    WHEN b.estimated_complete_date IS NOT NULL AND current_date > b.estimated_complete_date THEN true
    ELSE false
  END as is_overdue,
  b.owner,
  b.status,
  b.reason_code,
  b.is_critical
FROM public.implementation_blockers b
JOIN public.projects p ON p.id = b.project_id
JOIN public.companies c ON c.id = p.company_id
WHERE b.status = 'Live';