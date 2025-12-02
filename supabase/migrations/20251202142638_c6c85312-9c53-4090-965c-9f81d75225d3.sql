
-- Fix RLS Performance: Wrap auth.uid() in (select auth.uid()) to prevent per-row re-evaluation
-- This fixes auth_rls_initplan warnings for improved query performance

-- ============================================
-- Table: companies
-- ============================================
DROP POLICY IF EXISTS "companies_internal_insert" ON public.companies;
CREATE POLICY "companies_internal_insert" ON public.companies
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "companies_internal_read" ON public.companies;
CREATE POLICY "companies_internal_read" ON public.companies
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: profiles
-- ============================================
DROP POLICY IF EXISTS "user_own_profile_only" ON public.profiles;
CREATE POLICY "user_own_profile_only" ON public.profiles
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- ============================================
-- Table: solutions_projects
-- ============================================
DROP POLICY IF EXISTS "Internal users can view all solutions projects" ON public.solutions_projects;
CREATE POLICY "Internal users can view all solutions projects" ON public.solutions_projects FOR SELECT USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "Internal users can create solutions projects" ON public.solutions_projects;
CREATE POLICY "Internal users can create solutions projects" ON public.solutions_projects FOR INSERT WITH CHECK ((SELECT is_internal()));

DROP POLICY IF EXISTS "Internal users can update solutions projects" ON public.solutions_projects;
CREATE POLICY "Internal users can update solutions projects" ON public.solutions_projects FOR UPDATE USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "Internal users can delete solutions projects" ON public.solutions_projects;
CREATE POLICY "Internal users can delete solutions projects" ON public.solutions_projects FOR DELETE USING ((SELECT is_internal()));

-- ============================================
-- Table: solutions_lines
-- ============================================
DROP POLICY IF EXISTS "Internal users can view all solutions lines" ON public.solutions_lines;
CREATE POLICY "Internal users can view all solutions lines" ON public.solutions_lines FOR SELECT USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "Internal users can create solutions lines" ON public.solutions_lines;
CREATE POLICY "Internal users can create solutions lines" ON public.solutions_lines FOR INSERT WITH CHECK ((SELECT is_internal()));

DROP POLICY IF EXISTS "Internal users can update solutions lines" ON public.solutions_lines;
CREATE POLICY "Internal users can update solutions lines" ON public.solutions_lines FOR UPDATE USING ((SELECT is_internal()));

DROP POLICY IF EXISTS "Internal users can delete solutions lines" ON public.solutions_lines;
CREATE POLICY "Internal users can delete solutions lines" ON public.solutions_lines FOR DELETE USING ((SELECT is_internal()));

-- ============================================
-- Table: iot_devices
-- ============================================
DROP POLICY IF EXISTS "iot_devices_external_delete" ON public.iot_devices;
CREATE POLICY "iot_devices_external_delete" ON public.iot_devices FOR DELETE USING (EXISTS (
  SELECT 1 FROM equipment e JOIN lines l ON l.id = e.line_id JOIN project_members pm ON pm.project_id = l.project_id
  WHERE e.id = iot_devices.equipment_id AND pm.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "iot_devices_external_select_solutions" ON public.iot_devices;
CREATE POLICY "iot_devices_external_select_solutions" ON public.iot_devices FOR SELECT USING (EXISTS (
  SELECT 1 FROM equipment e JOIN solutions_lines sl ON sl.id = e.solutions_line_id JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
  WHERE e.id = iot_devices.equipment_id AND sp.company_id = (SELECT user_company_id())
));

-- ============================================
-- Table: projects
-- ============================================
DROP POLICY IF EXISTS "projects_external_select" ON public.projects;
CREATE POLICY "projects_external_select" ON public.projects FOR SELECT USING (company_id = (SELECT user_company_id()));

-- ============================================
-- Table: project_members
-- ============================================
DROP POLICY IF EXISTS "pm_internal_all" ON public.project_members;
CREATE POLICY "pm_internal_all" ON public.project_members FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: lines
-- ============================================
DROP POLICY IF EXISTS "lines_internal_all" ON public.lines;
CREATE POLICY "lines_internal_all" ON public.lines FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "lines_external_select" ON public.lines;
CREATE POLICY "lines_external_select" ON public.lines FOR SELECT USING (project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id())));

DROP POLICY IF EXISTS "lines_external_update" ON public.lines;
CREATE POLICY "lines_external_update" ON public.lines FOR UPDATE USING (project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = (SELECT auth.uid())));

-- ============================================
-- Table: equipment
-- ============================================
DROP POLICY IF EXISTS "equipment_external_select" ON public.equipment;
CREATE POLICY "equipment_external_select" ON public.equipment FOR SELECT USING (
  line_id IN (SELECT l.id FROM lines l JOIN projects pr ON pr.id = l.project_id WHERE pr.company_id = (SELECT user_company_id()))
  OR solutions_line_id IN (SELECT sl.id FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id WHERE sp.company_id = (SELECT user_company_id()))
);

-- ============================================
-- Table: cameras_master
-- ============================================
DROP POLICY IF EXISTS "cameras_master_internal_all" ON public.cameras_master;
CREATE POLICY "cameras_master_internal_all" ON public.cameras_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: project_tasks
-- ============================================
DROP POLICY IF EXISTS "pt_internal_all" ON public.project_tasks;
CREATE POLICY "pt_internal_all" ON public.project_tasks FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "pt_external_select" ON public.project_tasks;
CREATE POLICY "pt_external_select" ON public.project_tasks FOR SELECT USING (
  project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id()))
  OR solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id()))
);

DROP POLICY IF EXISTS "pt_external_update" ON public.project_tasks;
CREATE POLICY "pt_external_update" ON public.project_tasks FOR UPDATE USING (
  project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = (SELECT auth.uid()))
  OR solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id()))
);

-- ============================================
-- Table: actions
-- ============================================
DROP POLICY IF EXISTS "actions_internal_all" ON public.actions;
CREATE POLICY "actions_internal_all" ON public.actions FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "actions_external_insert" ON public.actions;
CREATE POLICY "actions_external_insert" ON public.actions FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM project_members pm JOIN project_tasks pt ON pt.project_id = pm.project_id
  WHERE pt.id = actions.project_task_id AND pm.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "actions_external_update" ON public.actions;
CREATE POLICY "actions_external_update" ON public.actions FOR UPDATE USING (EXISTS (
  SELECT 1 FROM project_members pm JOIN project_tasks pt ON pt.project_id = pm.project_id
  WHERE pt.id = actions.project_task_id AND pm.user_id = (SELECT auth.uid())
));

-- ============================================
-- Table: lens_master
-- ============================================
DROP POLICY IF EXISTS "lens_master_internal_all" ON public.lens_master;
CREATE POLICY "lens_master_internal_all" ON public.lens_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: attachments
-- ============================================
DROP POLICY IF EXISTS "att_internal_all" ON public.attachments;
CREATE POLICY "att_internal_all" ON public.attachments FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "att_external_select" ON public.attachments;
CREATE POLICY "att_external_select" ON public.attachments FOR SELECT USING (action_id IN (
  SELECT a.id FROM actions a JOIN project_tasks pt ON pt.id = a.project_task_id JOIN projects pr ON pr.id = pt.project_id WHERE pr.company_id = (SELECT user_company_id())
));

DROP POLICY IF EXISTS "att_external_insert" ON public.attachments;
CREATE POLICY "att_external_insert" ON public.attachments FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM project_members pm JOIN actions a ON true JOIN project_tasks pt ON pt.id = a.project_task_id
  WHERE a.id = attachments.action_id AND pm.project_id = pt.project_id AND pm.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "att_external_update" ON public.attachments;
CREATE POLICY "att_external_update" ON public.attachments FOR UPDATE USING (EXISTS (
  SELECT 1 FROM project_members pm JOIN actions a ON true JOIN project_tasks pt ON pt.id = a.project_task_id
  WHERE a.id = attachments.action_id AND pm.project_id = pt.project_id AND pm.user_id = (SELECT auth.uid())
));

-- ============================================
-- Table: audit_logs
-- ============================================
DROP POLICY IF EXISTS "aud_internal_select" ON public.audit_logs;
CREATE POLICY "aud_internal_select" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: plc_master
-- ============================================
DROP POLICY IF EXISTS "plc_master_internal_all" ON public.plc_master;
CREATE POLICY "plc_master_internal_all" ON public.plc_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: servers_master
-- ============================================
DROP POLICY IF EXISTS "servers_master_internal_all" ON public.servers_master;
CREATE POLICY "servers_master_internal_all" ON public.servers_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: gateways_master
-- ============================================
DROP POLICY IF EXISTS "gateways_master_internal_all" ON public.gateways_master;
CREATE POLICY "gateways_master_internal_all" ON public.gateways_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: receivers_master
-- ============================================
DROP POLICY IF EXISTS "receivers_master_internal_all" ON public.receivers_master;
CREATE POLICY "receivers_master_internal_all" ON public.receivers_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: tv_displays_master
-- ============================================
DROP POLICY IF EXISTS "tv_displays_master_internal_all" ON public.tv_displays_master;
CREATE POLICY "tv_displays_master_internal_all" ON public.tv_displays_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: lights
-- ============================================
DROP POLICY IF EXISTS "lights_internal_all" ON public.lights;
CREATE POLICY "lights_internal_all" ON public.lights FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: project_events
-- ============================================
DROP POLICY IF EXISTS "events_external_select" ON public.project_events;
CREATE POLICY "events_external_select" ON public.project_events FOR SELECT USING (
  project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id()))
  OR solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id()))
);

-- ============================================
-- Table: cameras
-- ============================================
DROP POLICY IF EXISTS "cameras_external_select_solutions" ON public.cameras;
CREATE POLICY "cameras_external_select_solutions" ON public.cameras FOR SELECT USING (EXISTS (
  SELECT 1 FROM equipment e JOIN solutions_lines sl ON sl.id = e.solutions_line_id JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
  WHERE e.id = cameras.equipment_id AND sp.company_id = (SELECT user_company_id())
));

-- ============================================
-- Table: camera_measurements
-- ============================================
DROP POLICY IF EXISTS "camera_measurements_member_modify" ON public.camera_measurements;
CREATE POLICY "camera_measurements_member_modify" ON public.camera_measurements FOR ALL USING ((SELECT is_internal()) OR EXISTS (
  SELECT 1 FROM cameras c JOIN equipment e ON e.id = c.equipment_id LEFT JOIN lines l ON l.id = e.line_id LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id LEFT JOIN project_members pm ON pm.project_id = l.project_id
  WHERE c.id = camera_measurements.camera_id AND (pm.user_id = (SELECT auth.uid()) OR sl.solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id())))
));

-- ============================================
-- Table: camera_use_cases
-- ============================================
DROP POLICY IF EXISTS "camera_use_cases_member_modify" ON public.camera_use_cases;
CREATE POLICY "camera_use_cases_member_modify" ON public.camera_use_cases FOR ALL USING ((SELECT is_internal()) OR EXISTS (
  SELECT 1 FROM cameras c JOIN equipment e ON e.id = c.equipment_id LEFT JOIN lines l ON l.id = e.line_id LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id LEFT JOIN project_members pm ON pm.project_id = l.project_id
  WHERE c.id = camera_use_cases.camera_id AND (pm.user_id = (SELECT auth.uid()) OR sl.solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id())))
));

-- ============================================
-- Table: camera_attributes
-- ============================================
DROP POLICY IF EXISTS "camera_attributes_member_modify" ON public.camera_attributes;
CREATE POLICY "camera_attributes_member_modify" ON public.camera_attributes FOR ALL USING ((SELECT is_internal()) OR EXISTS (
  SELECT 1 FROM cameras c JOIN equipment e ON e.id = c.equipment_id LEFT JOIN lines l ON l.id = e.line_id LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id LEFT JOIN project_members pm ON pm.project_id = l.project_id
  WHERE c.id = camera_attributes.camera_id AND (pm.user_id = (SELECT auth.uid()) OR sl.solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id())))
));

-- ============================================
-- Table: camera_views
-- ============================================
DROP POLICY IF EXISTS "camera_views_member_modify" ON public.camera_views;
CREATE POLICY "camera_views_member_modify" ON public.camera_views FOR ALL USING ((SELECT is_internal()) OR EXISTS (
  SELECT 1 FROM cameras c JOIN equipment e ON e.id = c.equipment_id LEFT JOIN lines l ON l.id = e.line_id LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id LEFT JOIN project_members pm ON pm.project_id = l.project_id
  WHERE c.id = camera_views.camera_id AND (pm.user_id = (SELECT auth.uid()) OR sl.solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id())))
));

-- ============================================
-- Table: camera_plc_outputs
-- ============================================
DROP POLICY IF EXISTS "camera_plc_outputs_member_modify" ON public.camera_plc_outputs;
CREATE POLICY "camera_plc_outputs_member_modify" ON public.camera_plc_outputs FOR ALL USING ((SELECT is_internal()) OR EXISTS (
  SELECT 1 FROM cameras c JOIN equipment e ON e.id = c.equipment_id LEFT JOIN lines l ON l.id = e.line_id LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id LEFT JOIN project_members pm ON pm.project_id = l.project_id
  WHERE c.id = camera_plc_outputs.camera_id AND (pm.user_id = (SELECT auth.uid()) OR sl.solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id())))
));

-- ============================================
-- Table: positions
-- ============================================
DROP POLICY IF EXISTS "positions_internal_all" ON public.positions;
CREATE POLICY "positions_internal_all" ON public.positions FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "positions_external_select" ON public.positions;
CREATE POLICY "positions_external_select" ON public.positions FOR SELECT USING (
  line_id IN (SELECT l.id FROM lines l JOIN projects pr ON pr.id = l.project_id WHERE pr.company_id = (SELECT user_company_id()))
  OR solutions_line_id IN (SELECT sl.id FROM solutions_lines sl JOIN solutions_projects sp ON sp.id = sl.solutions_project_id WHERE sp.company_id = (SELECT user_company_id()))
);

-- ============================================
-- Table: implementation_blockers
-- ============================================
DROP POLICY IF EXISTS "implementation_blockers_internal_all" ON public.implementation_blockers;
CREATE POLICY "implementation_blockers_internal_all" ON public.implementation_blockers FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "implementation_blockers_external_select" ON public.implementation_blockers;
CREATE POLICY "implementation_blockers_external_select" ON public.implementation_blockers FOR SELECT USING (project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id())));

-- ============================================
-- Table: product_gaps
-- ============================================
DROP POLICY IF EXISTS "product_gaps_internal_all" ON public.product_gaps;
CREATE POLICY "product_gaps_internal_all" ON public.product_gaps FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "product_gaps_external_select" ON public.product_gaps;
CREATE POLICY "product_gaps_external_select" ON public.product_gaps FOR SELECT USING (
  project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id()))
  OR solutions_project_id IN (SELECT sp.id FROM solutions_projects sp WHERE sp.company_id = (SELECT user_company_id()))
);

-- ============================================
-- Table: feature_requests
-- ============================================
DROP POLICY IF EXISTS "feature_requests_internal_all" ON public.feature_requests;
CREATE POLICY "feature_requests_internal_all" ON public.feature_requests FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: user_roles
-- ============================================
DROP POLICY IF EXISTS "user_roles_internal_select" ON public.user_roles;
CREATE POLICY "user_roles_internal_select" ON public.user_roles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: vision_models
-- ============================================
DROP POLICY IF EXISTS "vision_models_internal_all" ON public.vision_models;
CREATE POLICY "vision_models_internal_all" ON public.vision_models FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "vision_models_external_select" ON public.vision_models;
CREATE POLICY "vision_models_external_select" ON public.vision_models FOR SELECT USING (project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id())));

-- ============================================
-- Table: hardware_master
-- ============================================
DROP POLICY IF EXISTS "hardware_master_internal_all" ON public.hardware_master;
CREATE POLICY "hardware_master_internal_all" ON public.hardware_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: vision_use_cases_master
-- ============================================
DROP POLICY IF EXISTS "vision_use_cases_master_internal_all" ON public.vision_use_cases_master;
CREATE POLICY "vision_use_cases_master_internal_all" ON public.vision_use_cases_master FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

-- ============================================
-- Table: hardware_status_tracking
-- ============================================
DROP POLICY IF EXISTS "hardware_status_tracking_internal_all" ON public.hardware_status_tracking;
CREATE POLICY "hardware_status_tracking_internal_all" ON public.hardware_status_tracking FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "hardware_status_tracking_external_select" ON public.hardware_status_tracking;
CREATE POLICY "hardware_status_tracking_external_select" ON public.hardware_status_tracking FOR SELECT USING (project_id IN (SELECT pr.id FROM projects pr WHERE pr.company_id = (SELECT user_company_id())));

-- ============================================
-- Table: equipment_titles
-- ============================================
DROP POLICY IF EXISTS "equipment_titles_internal_all" ON public.equipment_titles;
CREATE POLICY "equipment_titles_internal_all" ON public.equipment_titles FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "equipment_titles_external_select" ON public.equipment_titles;
CREATE POLICY "equipment_titles_external_select" ON public.equipment_titles FOR SELECT USING (equipment_id IN (
  SELECT e.id FROM equipment e LEFT JOIN lines l ON l.id = e.line_id LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id LEFT JOIN projects pr ON pr.id = l.project_id LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
  WHERE pr.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
));

-- ============================================
-- Table: position_titles
-- ============================================
DROP POLICY IF EXISTS "position_titles_internal_all" ON public.position_titles;
CREATE POLICY "position_titles_internal_all" ON public.position_titles FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "position_titles_external_select" ON public.position_titles;
CREATE POLICY "position_titles_external_select" ON public.position_titles FOR SELECT USING (position_id IN (
  SELECT pos.id FROM positions pos LEFT JOIN lines l ON l.id = pos.line_id LEFT JOIN solutions_lines sl ON sl.id = pos.solutions_line_id LEFT JOIN projects pr ON pr.id = l.project_id LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
  WHERE pr.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
));

-- ============================================
-- Table: subtasks
-- ============================================
DROP POLICY IF EXISTS "subtasks_internal_all" ON public.subtasks;
CREATE POLICY "subtasks_internal_all" ON public.subtasks FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_internal = true));

DROP POLICY IF EXISTS "subtasks_external_select" ON public.subtasks;
CREATE POLICY "subtasks_external_select" ON public.subtasks FOR SELECT USING (task_id IN (
  SELECT pt.id FROM project_tasks pt JOIN projects pr ON pr.id = pt.project_id WHERE pr.company_id = (SELECT user_company_id())
));
