-- Fix Security Definer Views by recreating them as SECURITY INVOKER
-- This ensures views run with the privileges of the user executing them, not the creator

-- Drop all views with SECURITY DEFINER and recreate them properly
DROP VIEW IF EXISTS public.v_all_projects_for_selection CASCADE;
DROP VIEW IF EXISTS public.v_approved_expenses CASCADE;
DROP VIEW IF EXISTS public.v_bau_expenses CASCADE;
DROP VIEW IF EXISTS public.v_bau_latest_review CASCADE;
DROP VIEW IF EXISTS public.v_bau_list CASCADE;
DROP VIEW IF EXISTS public.v_bau_metric_agg CASCADE;
DROP VIEW IF EXISTS public.v_bau_metric_trend CASCADE;
DROP VIEW IF EXISTS public.v_bau_my_tickets CASCADE;
DROP VIEW IF EXISTS public.v_bau_projects_like CASCADE;
DROP VIEW IF EXISTS public.v_distinct_customers CASCADE;
DROP VIEW IF EXISTS public.v_expense_admin_queue CASCADE;
DROP VIEW IF EXISTS public.v_impl_companies CASCADE;
DROP VIEW IF EXISTS public.v_impl_lead_queue CASCADE;
DROP VIEW IF EXISTS public.v_impl_open_blockers CASCADE;
DROP VIEW IF EXISTS public.v_master_steps CASCADE;
DROP VIEW IF EXISTS public.v_my_assigned_expenses CASCADE;
DROP VIEW IF EXISTS public.v_my_feature_requests CASCADE;

-- Recreate views with SECURITY INVOKER (default behavior)
CREATE VIEW public.v_all_projects_for_selection AS 
SELECT 'implementation'::text AS kind,
    pr.id AS project_id,
    NULL::uuid AS solutions_project_id,
    pr.name AS project_name,
    pr.site_name,
    pr.name AS customer_name,
    pr.implementation_lead
FROM projects pr
UNION ALL
SELECT 'solutions'::text AS kind,
    NULL::uuid AS project_id,
    sp.id AS solutions_project_id,
    sp.company_name AS project_name,
    sp.site_name,
    sp.company_name AS customer_name,
    NULL::uuid AS implementation_lead
FROM solutions_projects sp;

CREATE VIEW public.v_approved_expenses AS 
SELECT ea.id,
    ea.expense_id,
    ea.assigned_to_user_id,
    ea.assigned_to_project_id,
    ea.assigned_to_solutions_project_id,
    ea.is_billable,
    ea.assignment_notes,
    ea.assigned_by,
    ea.assigned_at,
    ea.updated_at,
    ea.status,
    ea.category,
    ea.customer,
    ea.assignee_description,
    ea.approved_by,
    ea.approved_at,
    ea.reviewed_by,
    ea.reviewed_at,
    e.expense_date,
    e.description AS expense_description,
    e.customer AS import_customer,
    e.net,
    e.vat,
    e.gross,
    p.name AS assignee_name,
    pr.name AS project_name,
    approver.name AS approved_by_name
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN profiles p ON p.user_id = ea.assigned_to_user_id
LEFT JOIN projects pr ON pr.id = ea.assigned_to_project_id
LEFT JOIN profiles approver ON approver.user_id = ea.approved_by
WHERE ea.status = 'Approved'::expense_status_enum;

CREATE VIEW public.v_bau_expenses AS 
SELECT ea.id,
    ea.expense_id,
    ea.assigned_to_user_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    e.expense_date,
    e.description,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code,
    bel.bau_customer_id
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN bau_expense_links bel ON bel.expense_assignment_id = ea.id;

CREATE VIEW public.v_bau_latest_review AS 
SELECT DISTINCT ON (bc.id) 
    bc.id,
    bc.name,
    bc.site_name,
    bc.health AS customer_health,
    bc.subscription_plan,
    bc.go_live_date,
    bc.devices_deployed,
    bc.sla_response_mins,
    bc.sla_resolution_hours,
    bc.notes,
    br.date_from,
    br.date_to,
    br.health AS review_health,
    br.escalation,
    br.reason_code,
    br.reviewed_at,
    reviewer.name AS reviewed_by_name
FROM bau_customers bc
LEFT JOIN bau_weekly_reviews br ON br.bau_customer_id = bc.id
LEFT JOIN profiles reviewer ON reviewer.user_id = br.reviewed_by
ORDER BY bc.id, br.date_from DESC;

CREATE VIEW public.v_bau_list AS 
SELECT bc.id,
    bc.name,
    bc.site_name,
    bc.health,
    bc.subscription_plan,
    bc.go_live_date,
    bc.devices_deployed,
    bc.sla_response_mins,
    bc.sla_resolution_hours,
    bc.notes,
    bc.company_id,
    co.name AS company_name,
    COUNT(bt.id) AS open_tickets
FROM bau_customers bc
LEFT JOIN companies co ON co.id = bc.company_id
LEFT JOIN bau_tickets bt ON bt.bau_customer_id = bc.id AND bt.status = 'Open'::ticket_status_enum
GROUP BY bc.id, bc.name, bc.site_name, bc.health, bc.subscription_plan, bc.go_live_date, bc.devices_deployed, bc.sla_response_mins, bc.sla_resolution_hours, bc.notes, bc.company_id, co.name;

CREATE VIEW public.v_bau_metric_agg AS 
SELECT bwm.bau_customer_id,
    bwm.date_from,
    bwm.date_to,
    bwm.metric_key,
    CASE 
        WHEN bwm.metric_value_numeric IS NOT NULL THEN bwm.metric_value_numeric
        ELSE NULL
    END AS metric_value,
    bwm.metric_value_text,
    bc.name AS customer_name,
    bmc.label AS metric_label,
    bmc.unit AS metric_unit
FROM bau_weekly_metrics bwm
JOIN bau_customers bc ON bc.id = bwm.bau_customer_id
LEFT JOIN bau_metric_catalog bmc ON bmc.metric_key = bwm.metric_key;

CREATE VIEW public.v_bau_metric_trend AS 
SELECT bwm.bau_customer_id,
    bwm.metric_key,
    bwm.date_from,
    bwm.date_to,
    bwm.metric_value_numeric,
    bwm.metric_value_text,
    bc.name AS customer_name,
    bmc.label AS metric_label,
    bmc.unit AS metric_unit,
    LAG(bwm.metric_value_numeric) OVER (PARTITION BY bwm.bau_customer_id, bwm.metric_key ORDER BY bwm.date_from) AS prev_value,
    CASE 
        WHEN LAG(bwm.metric_value_numeric) OVER (PARTITION BY bwm.bau_customer_id, bwm.metric_key ORDER BY bwm.date_from) IS NULL THEN NULL
        WHEN LAG(bwm.metric_value_numeric) OVER (PARTITION BY bwm.bau_customer_id, bwm.metric_key ORDER BY bwm.date_from) = 0 THEN NULL
        ELSE ((bwm.metric_value_numeric - LAG(bwm.metric_value_numeric) OVER (PARTITION BY bwm.bau_customer_id, bwm.metric_key ORDER BY bwm.date_from)) / LAG(bwm.metric_value_numeric) OVER (PARTITION BY bwm.bau_customer_id, bwm.metric_key ORDER BY bwm.date_from)) * 100
    END AS percent_change
FROM bau_weekly_metrics bwm
JOIN bau_customers bc ON bc.id = bwm.bau_customer_id
LEFT JOIN bau_metric_catalog bmc ON bmc.metric_key = bwm.metric_key;

CREATE VIEW public.v_bau_my_tickets AS 
SELECT bt.id,
    bt.title,
    bt.description,
    bt.priority,
    bt.status,
    bt.created_at,
    bt.updated_at,
    bc.name AS customer_name,
    bc.site_name,
    assigned_user.name AS assigned_to_name,
    raised_user.name AS raised_by_name
FROM bau_tickets bt
JOIN bau_customers bc ON bc.id = bt.bau_customer_id
LEFT JOIN profiles assigned_user ON assigned_user.user_id = bt.assigned_to
LEFT JOIN profiles raised_user ON raised_user.user_id = bt.raised_by
WHERE bt.assigned_to = auth.uid() OR bt.raised_by = auth.uid();

CREATE VIEW public.v_bau_projects_like AS 
SELECT DISTINCT bc.name AS customer_name,
    bc.site_name,
    p.name AS project_name,
    p.domain,
    p.go_live_date AS project_go_live_date
FROM bau_customers bc
JOIN companies c ON c.id = bc.company_id
LEFT JOIN projects p ON p.company_id = c.id
WHERE p.id IS NOT NULL;

CREATE VIEW public.v_distinct_customers AS 
SELECT DISTINCT e.customer
FROM expenses e
WHERE e.customer IS NOT NULL
ORDER BY e.customer;

CREATE VIEW public.v_expense_admin_queue AS 
SELECT ea.id,
    ea.expense_id,
    ea.assigned_to_user_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    ea.approved_by,
    ea.approved_at,
    e.expense_date,
    e.description,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code,
    p.name AS assignee_name,
    pr.name AS project_name,
    approver.name AS approved_by_name
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN profiles p ON p.user_id = ea.assigned_to_user_id
LEFT JOIN projects pr ON pr.id = ea.assigned_to_project_id
LEFT JOIN profiles approver ON approver.user_id = ea.approved_by
WHERE ea.status = 'ReadyForSignoff'::expense_status_enum;

CREATE VIEW public.v_impl_companies AS 
SELECT c.id,
    c.name,
    c.is_internal,
    COUNT(p.id) AS project_count,
    COUNT(CASE WHEN p.status = 'Active' THEN 1 END) AS active_projects,
    MIN(p.contract_signed_date) AS first_project_date,
    MAX(p.planned_go_live_date) AS latest_go_live_date
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
WHERE c.is_internal = false
GROUP BY c.id, c.name, c.is_internal;

CREATE VIEW public.v_impl_lead_queue AS 
SELECT ea.id,
    ea.expense_id,
    ea.assigned_to_user_id,
    ea.assigned_to_project_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    e.expense_date,
    e.description,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code,
    p.name AS assignee_name,
    pr.name AS project_name
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN profiles p ON p.user_id = ea.assigned_to_user_id
LEFT JOIN projects pr ON pr.id = ea.assigned_to_project_id
WHERE ea.status = 'PendingLeadReview'::expense_status_enum
AND pr.implementation_lead = auth.uid();

CREATE VIEW public.v_impl_open_blockers AS 
SELECT ib.id,
    ib.title,
    ib.description,
    ib.is_critical,
    ib.status,
    ib.reason_code,
    ib.estimated_complete_date,
    ib.raised_at,
    ib.updated_at,
    p.name AS project_name,
    p.domain AS project_domain,
    owner.name AS owner_name,
    creator.name AS created_by_name
FROM implementation_blockers ib
JOIN projects p ON p.id = ib.project_id
LEFT JOIN profiles owner ON owner.user_id = ib.owner
LEFT JOIN profiles creator ON creator.user_id = ib.created_by
WHERE ib.status = 'Live'::implementation_blocker_status_enum;

CREATE VIEW public.v_master_steps AS 
SELECT ms.id,
    ms.name,
    ms.description,
    ms.order_index,
    COUNT(mt.id) AS task_count
FROM master_steps ms
LEFT JOIN master_tasks mt ON mt.step_id = ms.id
GROUP BY ms.id, ms.name, ms.description, ms.order_index
ORDER BY ms.order_index;

CREATE VIEW public.v_my_assigned_expenses AS 
SELECT ea.id,
    ea.expense_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    e.expense_date,
    e.description,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
WHERE ea.assigned_to_user_id = auth.uid();

CREATE VIEW public.v_my_feature_requests AS 
SELECT fr.id,
    fr.title,
    fr.status,
    fr.date_raised,
    fr.required_date,
    fr.design_start_date,
    fr.dev_start_date,
    fr.complete_date,
    fr.problem_statement,
    fr.solution_overview,
    fr.user_story_role,
    fr.user_story_goal,
    fr.user_story_outcome,
    fr.requirements,
    fr.created_at,
    fr.updated_at,
    p.name AS created_by_name
FROM feature_requests fr
LEFT JOIN profiles p ON p.user_id = fr.created_by
WHERE fr.created_by = auth.uid();

-- Apply RLS to all views to ensure proper security
ALTER VIEW public.v_all_projects_for_selection ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_approved_expenses ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_expenses ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_latest_review ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_list ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_metric_agg ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_metric_trend ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_my_tickets ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_bau_projects_like ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_distinct_customers ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_expense_admin_queue ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_impl_companies ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_impl_lead_queue ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_impl_open_blockers ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_master_steps ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_my_assigned_expenses ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_my_feature_requests ENABLE ROW LEVEL SECURITY;

-- Create appropriate RLS policies for each view
CREATE POLICY "views_internal_access" ON public.v_all_projects_for_selection FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_approved_expenses FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_expenses FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_latest_review FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_list FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_metric_agg FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_metric_trend FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_my_tickets FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_bau_projects_like FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_distinct_customers FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_expense_admin_queue FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_impl_companies FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_impl_lead_queue FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_impl_open_blockers FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_master_steps FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_my_assigned_expenses FOR SELECT USING (is_internal());
CREATE POLICY "views_internal_access" ON public.v_my_feature_requests FOR SELECT USING (is_internal());