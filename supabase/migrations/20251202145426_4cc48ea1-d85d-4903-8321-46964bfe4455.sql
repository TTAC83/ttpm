-- Fix remaining auth_rls_initplan and multiple_permissive_policies issues

-- ===========================================
-- MASTER_STEPS TABLE
-- ===========================================
DROP POLICY IF EXISTS "ms_internal_admin_delete" ON public.master_steps;
DROP POLICY IF EXISTS "ms_internal_admin_insert" ON public.master_steps;
DROP POLICY IF EXISTS "ms_internal_admin_update" ON public.master_steps;
DROP POLICY IF EXISTS "ms_internal_read" ON public.master_steps;

CREATE POLICY "master_steps_all" ON public.master_steps
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- MASTER_TASKS TABLE
-- ===========================================
DROP POLICY IF EXISTS "mt_internal_admin_delete" ON public.master_tasks;
DROP POLICY IF EXISTS "mt_internal_admin_insert" ON public.master_tasks;
DROP POLICY IF EXISTS "mt_internal_admin_update" ON public.master_tasks;
DROP POLICY IF EXISTS "mt_internal_read" ON public.master_tasks;

CREATE POLICY "master_tasks_all" ON public.master_tasks
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- UK_BANK_HOLIDAYS TABLE
-- ===========================================
DROP POLICY IF EXISTS "ukbh_internal_admin_delete" ON public.uk_bank_holidays;
DROP POLICY IF EXISTS "ukbh_internal_admin_insert" ON public.uk_bank_holidays;
DROP POLICY IF EXISTS "ukbh_internal_admin_update" ON public.uk_bank_holidays;
DROP POLICY IF EXISTS "ukbh_internal_read" ON public.uk_bank_holidays;

CREATE POLICY "uk_bank_holidays_all" ON public.uk_bank_holidays
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- PROJECT_EVENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "events_external_delete" ON public.project_events;
DROP POLICY IF EXISTS "events_external_insert" ON public.project_events;
DROP POLICY IF EXISTS "events_external_update" ON public.project_events;
DROP POLICY IF EXISTS "events_external_select" ON public.project_events;
DROP POLICY IF EXISTS "events_internal_all" ON public.project_events;

CREATE POLICY "project_events_all" ON public.project_events
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_events.project_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = project_events.solutions_project_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- SOLUTIONS_PROJECT_SERVERS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can manage solutions project servers" ON public.solutions_project_servers;

CREATE POLICY "solutions_project_servers_internal_all" ON public.solutions_project_servers
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- SOLUTIONS_PROJECT_GATEWAYS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can manage solutions project gateways" ON public.solutions_project_gateways;

CREATE POLICY "solutions_project_gateways_internal_all" ON public.solutions_project_gateways
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- SOLUTIONS_PROJECT_RECEIVERS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can manage solutions project receivers" ON public.solutions_project_receivers;

CREATE POLICY "solutions_project_receivers_internal_all" ON public.solutions_project_receivers
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- SOLUTIONS_PROJECT_TV_DISPLAYS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can manage solutions project TV displays" ON public.solutions_project_tv_displays;

CREATE POLICY "solutions_project_tv_displays_internal_all" ON public.solutions_project_tv_displays
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- BAU_EXPENSE_LINKS TABLE
-- ===========================================
DROP POLICY IF EXISTS "bau_expense_links_insert" ON public.bau_expense_links;
DROP POLICY IF EXISTS "bau_expense_links_select" ON public.bau_expense_links;
DROP POLICY IF EXISTS "bau_expense_links_update" ON public.bau_expense_links;
DROP POLICY IF EXISTS "bau_expense_links_delete" ON public.bau_expense_links;

CREATE POLICY "bau_expense_links_all" ON public.bau_expense_links
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- COMPANIES TABLE - remove duplicates
-- ===========================================
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;

-- ===========================================
-- EQUIPMENT TABLE - remove duplicates
-- ===========================================
DROP POLICY IF EXISTS "equipment_select" ON public.equipment;
DROP POLICY IF EXISTS "equipment_insert" ON public.equipment;
DROP POLICY IF EXISTS "equipment_update" ON public.equipment;
DROP POLICY IF EXISTS "equipment_delete" ON public.equipment;

-- ===========================================
-- USER_ROLES TABLE - remove duplicates
-- ===========================================
DROP POLICY IF EXISTS "user_roles_modify" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_internal_select" ON public.user_roles;

-- ===========================================
-- VISION_MODELS TABLE - remove duplicates
-- ===========================================
DROP POLICY IF EXISTS "vision_models_modify" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_select" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_solutions_external_select" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_solutions_internal_all" ON public.vision_models;

-- ===========================================
-- PROFILES TABLE - fix duplicate policies
-- ===========================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_internal_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;

CREATE POLICY "profiles_all" ON public.profiles
  FOR ALL USING (
    user_id = (SELECT auth.uid())
    OR (SELECT is_internal())
  );

-- ===========================================
-- LENS_MASTER TABLE
-- ===========================================
DROP POLICY IF EXISTS "lens_master_internal_all" ON public.lens_master;
DROP POLICY IF EXISTS "lens_master_read" ON public.lens_master;

CREATE POLICY "lens_master_all" ON public.lens_master
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- VISION_USE_CASES_MASTER TABLE
-- ===========================================
DROP POLICY IF EXISTS "vision_use_cases_master_internal_all" ON public.vision_use_cases_master;
DROP POLICY IF EXISTS "vision_use_cases_master_read" ON public.vision_use_cases_master;

CREATE POLICY "vision_use_cases_master_all" ON public.vision_use_cases_master
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- BAU TABLES - consolidate policies
-- ===========================================
DROP POLICY IF EXISTS "bau_customers_internal_all" ON public.bau_customers;
DROP POLICY IF EXISTS "bau_customers_select" ON public.bau_customers;

CREATE POLICY "bau_customers_all" ON public.bau_customers
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_tickets_internal_all" ON public.bau_tickets;
DROP POLICY IF EXISTS "bau_tickets_select" ON public.bau_tickets;

CREATE POLICY "bau_tickets_all" ON public.bau_tickets
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_visits_internal_all" ON public.bau_visits;
DROP POLICY IF EXISTS "bau_visits_select" ON public.bau_visits;

CREATE POLICY "bau_visits_all" ON public.bau_visits
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_contacts_internal_all" ON public.bau_contacts;
DROP POLICY IF EXISTS "bau_contacts_select" ON public.bau_contacts;

CREATE POLICY "bau_contacts_all" ON public.bau_contacts
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_change_requests_internal_all" ON public.bau_change_requests;
DROP POLICY IF EXISTS "bau_change_requests_select" ON public.bau_change_requests;

CREATE POLICY "bau_change_requests_all" ON public.bau_change_requests
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_weekly_metrics_internal_all" ON public.bau_weekly_metrics;
DROP POLICY IF EXISTS "bau_weekly_metrics_select" ON public.bau_weekly_metrics;

CREATE POLICY "bau_weekly_metrics_all" ON public.bau_weekly_metrics
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_weekly_reviews_internal_all" ON public.bau_weekly_reviews;
DROP POLICY IF EXISTS "bau_weekly_reviews_select" ON public.bau_weekly_reviews;

CREATE POLICY "bau_weekly_reviews_all" ON public.bau_weekly_reviews
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_weekly_uploads_internal_all" ON public.bau_weekly_uploads;
DROP POLICY IF EXISTS "bau_weekly_uploads_select" ON public.bau_weekly_uploads;

CREATE POLICY "bau_weekly_uploads_all" ON public.bau_weekly_uploads
  FOR ALL USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "bau_sites_internal_all" ON public.bau_sites;
DROP POLICY IF EXISTS "bau_sites_select" ON public.bau_sites;

CREATE POLICY "bau_sites_all" ON public.bau_sites
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- EXPENSES TABLE
-- ===========================================
DROP POLICY IF EXISTS "expenses_internal_all" ON public.expenses;
DROP POLICY IF EXISTS "expenses_read" ON public.expenses;

CREATE POLICY "expenses_all" ON public.expenses
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- IMPL_WEEKLY_REVIEWS TABLE
-- ===========================================
DROP POLICY IF EXISTS "impl_weekly_reviews_internal_all" ON public.impl_weekly_reviews;
DROP POLICY IF EXISTS "impl_weekly_reviews_select" ON public.impl_weekly_reviews;

CREATE POLICY "impl_weekly_reviews_all" ON public.impl_weekly_reviews
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- IMPL_WEEKLY_WEEKS TABLE
-- ===========================================
DROP POLICY IF EXISTS "impl_weekly_weeks_internal_all" ON public.impl_weekly_weeks;
DROP POLICY IF EXISTS "impl_weekly_weeks_read" ON public.impl_weekly_weeks;

CREATE POLICY "impl_weekly_weeks_all" ON public.impl_weekly_weeks
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- BAU_METRIC_CATALOG TABLE
-- ===========================================
DROP POLICY IF EXISTS "bau_metric_catalog_internal_all" ON public.bau_metric_catalog;
DROP POLICY IF EXISTS "bau_metric_catalog_read" ON public.bau_metric_catalog;

CREATE POLICY "bau_metric_catalog_all" ON public.bau_metric_catalog
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- BAU_CUSTOMER_ALIASES TABLE
-- ===========================================
DROP POLICY IF EXISTS "bau_customer_aliases_internal_all" ON public.bau_customer_aliases;
DROP POLICY IF EXISTS "bau_customer_aliases_select" ON public.bau_customer_aliases;

CREATE POLICY "bau_customer_aliases_all" ON public.bau_customer_aliases
  FOR ALL USING ((SELECT is_internal()));