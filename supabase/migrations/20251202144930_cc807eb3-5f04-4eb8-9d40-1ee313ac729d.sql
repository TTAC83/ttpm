-- Fix remaining auth_rls_initplan issues and multiple_permissive_policies

-- ===========================================
-- COMPANIES TABLE
-- ===========================================
DROP POLICY IF EXISTS "companies_internal_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_internal_read" ON public.companies;

CREATE POLICY "companies_internal_all" ON public.companies
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- PROFILES TABLE
-- ===========================================
DROP POLICY IF EXISTS "user_own_profile_only" ON public.profiles;

CREATE POLICY "profiles_own_access" ON public.profiles
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- ===========================================
-- SOLUTIONS_PROJECTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can view all solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "Internal users can create solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "Internal users can update solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "Internal users can delete solutions projects" ON public.solutions_projects;

CREATE POLICY "solutions_projects_internal_all" ON public.solutions_projects
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- SOLUTIONS_LINES TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can view all solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "Internal users can create solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "Internal users can update solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "Internal users can delete solutions lines" ON public.solutions_lines;

CREATE POLICY "solutions_lines_internal_all" ON public.solutions_lines
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- IOT_DEVICES TABLE
-- ===========================================
DROP POLICY IF EXISTS "iot_devices_external_delete" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_internal_all" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_select" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_insert" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_update" ON public.iot_devices;

CREATE POLICY "iot_devices_all" ON public.iot_devices
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE e.id = iot_devices.equipment_id
      AND (p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id()))
    )
  );

-- ===========================================
-- LIGHTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "lights_internal_all" ON public.lights;

CREATE POLICY "lights_internal_all" ON public.lights
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- PROJECTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "projects_external_select" ON public.projects;
DROP POLICY IF EXISTS "projects_internal_all" ON public.projects;

CREATE POLICY "projects_all" ON public.projects
  FOR ALL USING (
    (SELECT is_internal())
    OR company_id = (SELECT user_company_id())
  );

-- ===========================================
-- PROJECT_MEMBERS TABLE
-- ===========================================
DROP POLICY IF EXISTS "pm_internal_all" ON public.project_members;
DROP POLICY IF EXISTS "pm_external_select" ON public.project_members;

CREATE POLICY "pm_all" ON public.project_members
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
      AND p.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- LINES TABLE
-- ===========================================
DROP POLICY IF EXISTS "lines_internal_all" ON public.lines;
DROP POLICY IF EXISTS "lines_external_select" ON public.lines;
DROP POLICY IF EXISTS "lines_external_update" ON public.lines;
DROP POLICY IF EXISTS "lines_external_insert" ON public.lines;
DROP POLICY IF EXISTS "lines_external_delete" ON public.lines;

CREATE POLICY "lines_all" ON public.lines
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = lines.project_id
      AND p.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- CAMERAS_MASTER TABLE
-- ===========================================
DROP POLICY IF EXISTS "cameras_master_internal_all" ON public.cameras_master;

CREATE POLICY "cameras_master_internal_all" ON public.cameras_master
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- PROJECT_TASKS TABLE
-- ===========================================
DROP POLICY IF EXISTS "pt_internal_all" ON public.project_tasks;
DROP POLICY IF EXISTS "pt_external_select" ON public.project_tasks;
DROP POLICY IF EXISTS "pt_external_update" ON public.project_tasks;

CREATE POLICY "pt_all" ON public.project_tasks
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_tasks.project_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = project_tasks.solutions_project_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- ACTIONS TABLE
-- ===========================================
DROP POLICY IF EXISTS "actions_external_select" ON public.actions;
DROP POLICY IF EXISTS "actions_internal_all" ON public.actions;

CREATE POLICY "actions_all" ON public.actions
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = actions.project_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = actions.solutions_project_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- EXPENSE_ASSIGNMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "expense_assignments_read" ON public.expense_assignments;
DROP POLICY IF EXISTS "expense_assignments_update" ON public.expense_assignments;
DROP POLICY IF EXISTS "expense_assignments_insert" ON public.expense_assignments;

CREATE POLICY "expense_assignments_all" ON public.expense_assignments
  FOR ALL USING (
    (SELECT is_internal())
    OR assigned_to_user_id = (SELECT auth.uid())
  );

-- ===========================================
-- PRODUCT_GAPS TABLE
-- ===========================================
DROP POLICY IF EXISTS "product_gaps_internal_all" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_select" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_insert" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_update" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_delete" ON public.product_gaps;

CREATE POLICY "product_gaps_all" ON public.product_gaps
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = product_gaps.project_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = product_gaps.solutions_project_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- CAMERA_PLC_OUTPUTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "camera_plc_outputs_member_modify" ON public.camera_plc_outputs;
DROP POLICY IF EXISTS "camera_plc_outputs_external_select" ON public.camera_plc_outputs;
DROP POLICY IF EXISTS "camera_plc_outputs_internal_all" ON public.camera_plc_outputs;

CREATE POLICY "camera_plc_outputs_all" ON public.camera_plc_outputs
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- SUBTASKS TABLE
-- ===========================================
DROP POLICY IF EXISTS "subtasks_select" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_update" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_delete" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_insert" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_internal_all" ON public.subtasks;

CREATE POLICY "subtasks_all" ON public.subtasks
  FOR ALL USING (
    (SELECT is_internal())
    OR (SELECT can_access_subtask(task_id))
  );

-- ===========================================
-- MASTER_TASK_DEPENDENCIES TABLE
-- ===========================================
DROP POLICY IF EXISTS "master_task_dependencies_internal_all" ON public.master_task_dependencies;

CREATE POLICY "master_task_dependencies_internal_all" ON public.master_task_dependencies
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- PROJECT_IOT_REQUIREMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "iot_req_external_insert" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_update" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_delete" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_select" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_internal_all" ON public.project_iot_requirements;

CREATE POLICY "iot_req_all" ON public.project_iot_requirements
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_iot_requirements.project_id
      AND p.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- EQUIPMENT TABLE
-- ===========================================
DROP POLICY IF EXISTS "equipment_external_select" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_insert" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_update" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_delete" ON public.equipment;
DROP POLICY IF EXISTS "equipment_internal_all" ON public.equipment;

CREATE POLICY "equipment_all" ON public.equipment
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM lines l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = equipment.line_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl
      JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = equipment.solutions_line_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- USER_ROLES TABLE
-- ===========================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Internal admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Internal admins can manage roles" ON public.user_roles;

CREATE POLICY "user_roles_all" ON public.user_roles
  FOR ALL USING (
    user_id = (SELECT auth.uid())
    OR (SELECT is_current_user_internal_admin())
  );

-- ===========================================
-- POSITION_TITLES TABLE
-- ===========================================
DROP POLICY IF EXISTS "position_titles_external_select" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_insert" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_update" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_delete" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_internal_all" ON public.position_titles;

CREATE POLICY "position_titles_all" ON public.position_titles
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- EQUIPMENT_TITLES TABLE
-- ===========================================
DROP POLICY IF EXISTS "equipment_titles_external_select" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_insert" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_update" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_delete" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_internal_all" ON public.equipment_titles;

CREATE POLICY "equipment_titles_all" ON public.equipment_titles
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- CAMERAS TABLE
-- ===========================================
DROP POLICY IF EXISTS "cameras_external_select" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_select_solutions" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_insert" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_update" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_delete" ON public.cameras;
DROP POLICY IF EXISTS "cameras_internal_all" ON public.cameras;

CREATE POLICY "cameras_all" ON public.cameras
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE e.id = cameras.equipment_id
      AND (p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id()))
    )
  );

-- ===========================================
-- CAMERA_MEASUREMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "camera_measurements_external_select" ON public.camera_measurements;
DROP POLICY IF EXISTS "camera_measurements_member_modify" ON public.camera_measurements;
DROP POLICY IF EXISTS "camera_measurements_internal_all" ON public.camera_measurements;

CREATE POLICY "camera_measurements_all" ON public.camera_measurements
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- CAMERA_USE_CASES TABLE
-- ===========================================
DROP POLICY IF EXISTS "camera_use_cases_external_select" ON public.camera_use_cases;
DROP POLICY IF EXISTS "camera_use_cases_member_modify" ON public.camera_use_cases;
DROP POLICY IF EXISTS "camera_use_cases_internal_all" ON public.camera_use_cases;

CREATE POLICY "camera_use_cases_all" ON public.camera_use_cases
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- CAMERA_VIEWS TABLE
-- ===========================================
DROP POLICY IF EXISTS "camera_views_external_select" ON public.camera_views;
DROP POLICY IF EXISTS "camera_views_member_modify" ON public.camera_views;
DROP POLICY IF EXISTS "camera_views_internal_all" ON public.camera_views;

CREATE POLICY "camera_views_all" ON public.camera_views
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- CAMERA_ATTRIBUTES TABLE
-- ===========================================
DROP POLICY IF EXISTS "camera_attributes_external_select" ON public.camera_attributes;
DROP POLICY IF EXISTS "camera_attributes_member_modify" ON public.camera_attributes;
DROP POLICY IF EXISTS "camera_attributes_internal_all" ON public.camera_attributes;

CREATE POLICY "camera_attributes_all" ON public.camera_attributes
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- POSITIONS TABLE
-- ===========================================
DROP POLICY IF EXISTS "positions_external_select" ON public.positions;
DROP POLICY IF EXISTS "positions_external_insert" ON public.positions;
DROP POLICY IF EXISTS "positions_external_update" ON public.positions;
DROP POLICY IF EXISTS "positions_external_delete" ON public.positions;
DROP POLICY IF EXISTS "positions_internal_all" ON public.positions;

CREATE POLICY "positions_all" ON public.positions
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM lines l
      JOIN projects p ON p.id = l.project_id
      WHERE l.id = positions.line_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_lines sl
      JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sl.id = positions.solutions_line_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- PROJECT_TASK_UPDATES TABLE
-- ===========================================
DROP POLICY IF EXISTS "Internal users can manage task updates" ON public.project_task_updates;
DROP POLICY IF EXISTS "Internal users can view all task updates" ON public.project_task_updates;

CREATE POLICY "project_task_updates_internal_all" ON public.project_task_updates
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- IMPLEMENTATION_BLOCKERS TABLE
-- ===========================================
DROP POLICY IF EXISTS "blockers_internal_all" ON public.implementation_blockers;
DROP POLICY IF EXISTS "blockers_external_select" ON public.implementation_blockers;
DROP POLICY IF EXISTS "blockers_external_insert" ON public.implementation_blockers;
DROP POLICY IF EXISTS "blockers_external_update" ON public.implementation_blockers;

CREATE POLICY "blockers_all" ON public.implementation_blockers
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = implementation_blockers.project_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = implementation_blockers.solutions_project_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- FEATURE_REQUESTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "feature_requests_internal_all" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_created_by" ON public.feature_requests;

CREATE POLICY "feature_requests_all" ON public.feature_requests
  FOR ALL USING (
    (SELECT is_internal())
    OR created_by = (SELECT auth.uid())
  );

-- ===========================================
-- VISION_MODELS TABLE
-- ===========================================
DROP POLICY IF EXISTS "vision_models_internal_all" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_external_select" ON public.vision_models;

CREATE POLICY "vision_models_all" ON public.vision_models
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = vision_models.project_id
      AND p.company_id = (SELECT user_company_id())
    )
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = vision_models.solutions_project_id
      AND sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- HARDWARE_STATUS_TRACKING TABLE
-- ===========================================
DROP POLICY IF EXISTS "hardware_status_internal_all" ON public.hardware_status_tracking;
DROP POLICY IF EXISTS "hardware_status_external_select" ON public.hardware_status_tracking;

CREATE POLICY "hardware_status_all" ON public.hardware_status_tracking
  FOR ALL USING (
    (SELECT is_internal())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = hardware_status_tracking.project_id
      AND p.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- ATTACHMENTS TABLE
-- ===========================================
DROP POLICY IF EXISTS "attachments_internal_all" ON public.attachments;
DROP POLICY IF EXISTS "attachments_external_select" ON public.attachments;

CREATE POLICY "attachments_all" ON public.attachments
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- EVENT_ATTENDEES TABLE
-- ===========================================
DROP POLICY IF EXISTS "event_attendees_internal_all" ON public.event_attendees;
DROP POLICY IF EXISTS "event_attendees_external_select" ON public.event_attendees;

CREATE POLICY "event_attendees_all" ON public.event_attendees
  FOR ALL USING ((SELECT is_internal()) OR true);

-- ===========================================
-- HARDWARE_MASTER TABLE
-- ===========================================
DROP POLICY IF EXISTS "hardware_master_internal_all" ON public.hardware_master;
DROP POLICY IF EXISTS "hardware_master_read" ON public.hardware_master;

CREATE POLICY "hardware_master_all" ON public.hardware_master
  FOR ALL USING ((SELECT is_internal()) OR true);