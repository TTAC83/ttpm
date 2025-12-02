-- Convert all 17 SECURITY DEFINER views to SECURITY INVOKER
-- This ensures views respect RLS policies of the querying user

ALTER VIEW public.v_all_projects_for_selection SET (security_invoker = on);
ALTER VIEW public.v_approved_expenses SET (security_invoker = on);
ALTER VIEW public.v_bau_expenses SET (security_invoker = on);
ALTER VIEW public.v_bau_latest_review SET (security_invoker = on);
ALTER VIEW public.v_bau_list SET (security_invoker = on);
ALTER VIEW public.v_bau_metric_agg SET (security_invoker = on);
ALTER VIEW public.v_bau_metric_trend SET (security_invoker = on);
ALTER VIEW public.v_bau_my_tickets SET (security_invoker = on);
ALTER VIEW public.v_bau_projects_like SET (security_invoker = on);
ALTER VIEW public.v_distinct_customers SET (security_invoker = on);
ALTER VIEW public.v_expense_admin_queue SET (security_invoker = on);
ALTER VIEW public.v_impl_companies SET (security_invoker = on);
ALTER VIEW public.v_impl_lead_queue SET (security_invoker = on);
ALTER VIEW public.v_impl_open_blockers SET (security_invoker = on);
ALTER VIEW public.v_master_steps SET (security_invoker = on);
ALTER VIEW public.v_my_assigned_expenses SET (security_invoker = on);
ALTER VIEW public.v_my_feature_requests SET (security_invoker = on);