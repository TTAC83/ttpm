
-- =============================================
-- FIX 1: Remove overly permissive RLS policies
-- =============================================

-- Drop "WHERE true" SELECT policies on master/catalog tables
DROP POLICY IF EXISTS cameras_master_select ON cameras_master;
DROP POLICY IF EXISTS hardware_master_select ON hardware_master;
DROP POLICY IF EXISTS lights_select ON lights;
DROP POLICY IF EXISTS contact_roles_master_select ON contact_roles_master;
DROP POLICY IF EXISTS master_task_dependencies_select ON master_task_dependencies;
DROP POLICY IF EXISTS vision_use_cases_master_select ON vision_use_cases_master;
DROP POLICY IF EXISTS wbs_read ON wbs_layouts;

-- Drop "is_internal() OR true" ALL policies (effectively public for everything)
DROP POLICY IF EXISTS camera_attributes_all ON camera_attributes;
DROP POLICY IF EXISTS camera_measurements_all ON camera_measurements;
DROP POLICY IF EXISTS camera_plc_outputs_all ON camera_plc_outputs;
DROP POLICY IF EXISTS camera_use_cases_all ON camera_use_cases;
DROP POLICY IF EXISTS camera_views_all ON camera_views;
DROP POLICY IF EXISTS event_attendees_all ON event_attendees;
DROP POLICY IF EXISTS hardware_master_all ON hardware_master;
DROP POLICY IF EXISTS position_titles_all ON position_titles;
DROP POLICY IF EXISTS vision_use_cases_master_all ON vision_use_cases_master;
DROP POLICY IF EXISTS lens_master_all ON lens_master;

-- Drop redundant wbs policies (proper scoped ones already exist)
DROP POLICY IF EXISTS wbs_update ON wbs_layouts;
DROP POLICY IF EXISTS wbs_upsert ON wbs_layouts;

-- Replace with authenticated-only SELECT for master/catalog tables
CREATE POLICY cameras_master_select ON cameras_master
  FOR SELECT TO authenticated USING (true);

CREATE POLICY hardware_master_select ON hardware_master
  FOR SELECT TO authenticated USING (true);

CREATE POLICY lights_select ON lights
  FOR SELECT TO authenticated USING (true);

CREATE POLICY contact_roles_master_select ON contact_roles_master
  FOR SELECT TO authenticated USING (true);

CREATE POLICY master_task_dependencies_select ON master_task_dependencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY vision_use_cases_master_select ON vision_use_cases_master
  FOR SELECT TO authenticated USING (true);

-- lens_master: add authenticated-only SELECT (the _all was the only read policy)
CREATE POLICY lens_master_select ON lens_master
  FOR SELECT TO authenticated USING (true);

-- lens_master: add internal-only modify
CREATE POLICY lens_master_modify ON lens_master
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- =============================================
-- FIX 2: Convert all views to SECURITY INVOKER
-- =============================================

ALTER VIEW v_all_projects_for_selection SET (security_invoker = true);
ALTER VIEW v_approved_expenses SET (security_invoker = true);
ALTER VIEW v_bau_expenses SET (security_invoker = true);
ALTER VIEW v_bau_latest_review SET (security_invoker = true);
ALTER VIEW v_bau_list SET (security_invoker = true);
ALTER VIEW v_bau_metric_agg SET (security_invoker = true);
ALTER VIEW v_bau_metric_trend SET (security_invoker = true);
ALTER VIEW v_bau_my_tickets SET (security_invoker = true);
ALTER VIEW v_bau_projects_like SET (security_invoker = true);
ALTER VIEW v_contacts_enriched SET (security_invoker = true);
ALTER VIEW v_distinct_customers SET (security_invoker = true);
ALTER VIEW v_expense_admin_queue SET (security_invoker = true);
ALTER VIEW v_impl_companies SET (security_invoker = true);
ALTER VIEW v_impl_lead_queue SET (security_invoker = true);
ALTER VIEW v_impl_open_blockers SET (security_invoker = true);
ALTER VIEW v_master_steps SET (security_invoker = true);
ALTER VIEW v_my_assigned_expenses SET (security_invoker = true);
ALTER VIEW v_my_feature_requests SET (security_invoker = true);

-- Revoke anon access from all views (only authenticated should access)
REVOKE ALL ON v_all_projects_for_selection FROM anon;
REVOKE ALL ON v_approved_expenses FROM anon;
REVOKE ALL ON v_bau_expenses FROM anon;
REVOKE ALL ON v_bau_latest_review FROM anon;
REVOKE ALL ON v_bau_list FROM anon;
REVOKE ALL ON v_bau_metric_agg FROM anon;
REVOKE ALL ON v_bau_metric_trend FROM anon;
REVOKE ALL ON v_bau_my_tickets FROM anon;
REVOKE ALL ON v_bau_projects_like FROM anon;
REVOKE ALL ON v_contacts_enriched FROM anon;
REVOKE ALL ON v_distinct_customers FROM anon;
REVOKE ALL ON v_expense_admin_queue FROM anon;
REVOKE ALL ON v_impl_companies FROM anon;
REVOKE ALL ON v_impl_lead_queue FROM anon;
REVOKE ALL ON v_impl_open_blockers FROM anon;
REVOKE ALL ON v_master_steps FROM anon;
REVOKE ALL ON v_my_assigned_expenses FROM anon;
REVOKE ALL ON v_my_feature_requests FROM anon;
