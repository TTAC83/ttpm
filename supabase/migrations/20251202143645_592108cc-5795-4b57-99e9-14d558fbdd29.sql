-- Fix auth_rls_initplan issues by wrapping auth.uid() and is_internal() in (SELECT ...)
-- Also consolidate multiple permissive policies into single unified policies

-- ===========================================
-- FIX: companies table (use 'id' not 'company_id')
-- ===========================================
DROP POLICY IF EXISTS "companies_internal_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_internal_read" ON public.companies;
DROP POLICY IF EXISTS "companies_internal_all" ON public.companies;
DROP POLICY IF EXISTS "companies_external_read" ON public.companies;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT USING ((SELECT is_internal()) OR id = (SELECT user_company_id()));

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT WITH CHECK ((SELECT is_internal()));

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE USING ((SELECT is_internal()));

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE USING ((SELECT is_internal()));

-- ===========================================
-- FIX: profiles table  
-- ===========================================
DROP POLICY IF EXISTS "user_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_internal_all" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) 
    OR (SELECT is_internal())
  );

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) 
    OR (SELECT is_internal())
  );

-- ===========================================
-- FIX: solutions_projects table
-- ===========================================
DROP POLICY IF EXISTS "Internal users can view all solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "Internal users can create solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "Internal users can update solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "Internal users can delete solutions projects" ON public.solutions_projects;
DROP POLICY IF EXISTS "External users can view company solutions projects" ON public.solutions_projects;

CREATE POLICY "solutions_projects_select" ON public.solutions_projects
  FOR SELECT USING (
    (SELECT is_internal()) 
    OR company_id = (SELECT user_company_id())
  );

CREATE POLICY "solutions_projects_insert" ON public.solutions_projects
  FOR INSERT WITH CHECK ((SELECT is_internal()));

CREATE POLICY "solutions_projects_update" ON public.solutions_projects
  FOR UPDATE USING ((SELECT is_internal()));

CREATE POLICY "solutions_projects_delete" ON public.solutions_projects
  FOR DELETE USING ((SELECT is_internal()));

-- ===========================================
-- FIX: solutions_lines table
-- ===========================================
DROP POLICY IF EXISTS "Internal users can view all solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "Internal users can create solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "Internal users can update solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "Internal users can delete solutions lines" ON public.solutions_lines;
DROP POLICY IF EXISTS "External users can view company solutions lines" ON public.solutions_lines;

CREATE POLICY "solutions_lines_select" ON public.solutions_lines
  FOR SELECT USING (
    (SELECT is_internal()) 
    OR EXISTS (
      SELECT 1 FROM solutions_projects sp 
      WHERE sp.id = solutions_project_id AND sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "solutions_lines_insert" ON public.solutions_lines
  FOR INSERT WITH CHECK ((SELECT is_internal()));

CREATE POLICY "solutions_lines_update" ON public.solutions_lines
  FOR UPDATE USING ((SELECT is_internal()));

CREATE POLICY "solutions_lines_delete" ON public.solutions_lines
  FOR DELETE USING ((SELECT is_internal()));

-- ===========================================
-- FIX: lights table
-- ===========================================
DROP POLICY IF EXISTS "lights_internal_all" ON public.lights;
DROP POLICY IF EXISTS "lights_external_read" ON public.lights;

CREATE POLICY "lights_select" ON public.lights
  FOR SELECT USING (true);

CREATE POLICY "lights_modify" ON public.lights
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: projects table
-- ===========================================
DROP POLICY IF EXISTS "projects_internal_all" ON public.projects;
DROP POLICY IF EXISTS "projects_external_select" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (
    (SELECT is_internal()) 
    OR company_id = (SELECT user_company_id())
    OR id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "projects_modify" ON public.projects
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: project_members table
-- ===========================================
DROP POLICY IF EXISTS "pm_internal_all" ON public.project_members;
DROP POLICY IF EXISTS "pm_external_select" ON public.project_members;

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "project_members_modify" ON public.project_members
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: lines table
-- ===========================================
DROP POLICY IF EXISTS "lines_internal_all" ON public.lines;
DROP POLICY IF EXISTS "lines_external_select" ON public.lines;
DROP POLICY IF EXISTS "lines_external_update" ON public.lines;
DROP POLICY IF EXISTS "lines_external_insert" ON public.lines;
DROP POLICY IF EXISTS "lines_external_delete" ON public.lines;

CREATE POLICY "lines_select" ON public.lines
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "lines_insert" ON public.lines
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "lines_update" ON public.lines
  FOR UPDATE USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "lines_delete" ON public.lines
  FOR DELETE USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

-- ===========================================
-- FIX: equipment table
-- ===========================================
DROP POLICY IF EXISTS "equipment_internal_all" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_select" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_insert" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_update" ON public.equipment;
DROP POLICY IF EXISTS "equipment_external_delete" ON public.equipment;

CREATE POLICY "equipment_select" ON public.equipment
  FOR SELECT USING (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

CREATE POLICY "equipment_insert" ON public.equipment
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

CREATE POLICY "equipment_update" ON public.equipment
  FOR UPDATE USING (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

CREATE POLICY "equipment_delete" ON public.equipment
  FOR DELETE USING (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

-- ===========================================
-- FIX: project_tasks table
-- ===========================================
DROP POLICY IF EXISTS "pt_internal_all" ON public.project_tasks;
DROP POLICY IF EXISTS "pt_external_select" ON public.project_tasks;
DROP POLICY IF EXISTS "pt_external_update" ON public.project_tasks;

CREATE POLICY "project_tasks_select" ON public.project_tasks
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "project_tasks_modify" ON public.project_tasks
  FOR ALL USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

-- ===========================================
-- FIX: cameras_master table  
-- ===========================================
DROP POLICY IF EXISTS "cameras_master_internal_all" ON public.cameras_master;
DROP POLICY IF EXISTS "cameras_master_external_read" ON public.cameras_master;

CREATE POLICY "cameras_master_select" ON public.cameras_master
  FOR SELECT USING (true);

CREATE POLICY "cameras_master_modify" ON public.cameras_master
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: iot_devices table
-- ===========================================
DROP POLICY IF EXISTS "iot_devices_internal_all" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_select" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_insert" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_update" ON public.iot_devices;
DROP POLICY IF EXISTS "iot_devices_external_delete" ON public.iot_devices;

CREATE POLICY "iot_devices_select" ON public.iot_devices
  FOR SELECT USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "iot_devices_insert" ON public.iot_devices
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "iot_devices_update" ON public.iot_devices
  FOR UPDATE USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "iot_devices_delete" ON public.iot_devices
  FOR DELETE USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- FIX: positions table
-- ===========================================
DROP POLICY IF EXISTS "positions_internal_all" ON public.positions;
DROP POLICY IF EXISTS "positions_external_select" ON public.positions;
DROP POLICY IF EXISTS "positions_external_insert" ON public.positions;
DROP POLICY IF EXISTS "positions_external_update" ON public.positions;
DROP POLICY IF EXISTS "positions_external_delete" ON public.positions;

CREATE POLICY "positions_select" ON public.positions
  FOR SELECT USING (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

CREATE POLICY "positions_insert" ON public.positions
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

CREATE POLICY "positions_update" ON public.positions
  FOR UPDATE USING (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

CREATE POLICY "positions_delete" ON public.positions
  FOR DELETE USING (
    (SELECT is_internal())
    OR line_id IN (SELECT id FROM lines WHERE project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id())))
    OR solutions_line_id IN (SELECT id FROM solutions_lines WHERE solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id())))
  );

-- ===========================================
-- FIX: position_titles table
-- ===========================================
DROP POLICY IF EXISTS "position_titles_internal_all" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_select" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_insert" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_update" ON public.position_titles;
DROP POLICY IF EXISTS "position_titles_external_delete" ON public.position_titles;

CREATE POLICY "position_titles_select" ON public.position_titles
  FOR SELECT USING (
    (SELECT is_internal())
    OR position_id IN (
      SELECT p.id FROM positions p
      LEFT JOIN lines l ON l.id = p.line_id
      LEFT JOIN solutions_lines sl ON sl.id = p.solutions_line_id
      LEFT JOIN projects pr ON pr.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE pr.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "position_titles_insert" ON public.position_titles
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR position_id IN (
      SELECT p.id FROM positions p
      LEFT JOIN lines l ON l.id = p.line_id
      LEFT JOIN solutions_lines sl ON sl.id = p.solutions_line_id
      LEFT JOIN projects pr ON pr.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE pr.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "position_titles_update" ON public.position_titles
  FOR UPDATE USING (
    (SELECT is_internal())
    OR position_id IN (
      SELECT p.id FROM positions p
      LEFT JOIN lines l ON l.id = p.line_id
      LEFT JOIN solutions_lines sl ON sl.id = p.solutions_line_id
      LEFT JOIN projects pr ON pr.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE pr.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "position_titles_delete" ON public.position_titles
  FOR DELETE USING (
    (SELECT is_internal())
    OR position_id IN (
      SELECT p.id FROM positions p
      LEFT JOIN lines l ON l.id = p.line_id
      LEFT JOIN solutions_lines sl ON sl.id = p.solutions_line_id
      LEFT JOIN projects pr ON pr.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE pr.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- FIX: equipment_titles table
-- ===========================================
DROP POLICY IF EXISTS "equipment_titles_internal_all" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_select" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_insert" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_update" ON public.equipment_titles;
DROP POLICY IF EXISTS "equipment_titles_external_delete" ON public.equipment_titles;

CREATE POLICY "equipment_titles_select" ON public.equipment_titles
  FOR SELECT USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "equipment_titles_insert" ON public.equipment_titles
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "equipment_titles_update" ON public.equipment_titles
  FOR UPDATE USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "equipment_titles_delete" ON public.equipment_titles
  FOR DELETE USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- FIX: actions table
-- ===========================================
DROP POLICY IF EXISTS "actions_internal_all" ON public.actions;
DROP POLICY IF EXISTS "actions_external_select" ON public.actions;
DROP POLICY IF EXISTS "actions_external_insert" ON public.actions;
DROP POLICY IF EXISTS "actions_external_update" ON public.actions;

CREATE POLICY "actions_select" ON public.actions
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "actions_modify" ON public.actions
  FOR ALL USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

-- ===========================================
-- FIX: cameras table
-- ===========================================
DROP POLICY IF EXISTS "cameras_internal_all" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_select" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_insert" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_update" ON public.cameras;
DROP POLICY IF EXISTS "cameras_external_delete" ON public.cameras;
DROP POLICY IF EXISTS "cameras_member_modify" ON public.cameras;

CREATE POLICY "cameras_select" ON public.cameras
  FOR SELECT USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "cameras_insert" ON public.cameras
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "cameras_update" ON public.cameras
  FOR UPDATE USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

CREATE POLICY "cameras_delete" ON public.cameras
  FOR DELETE USING (
    (SELECT is_internal())
    OR equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    )
  );

-- ===========================================
-- FIX: camera_measurements table
-- ===========================================
DROP POLICY IF EXISTS "camera_measurements_internal_all" ON public.camera_measurements;
DROP POLICY IF EXISTS "camera_measurements_external_select" ON public.camera_measurements;
DROP POLICY IF EXISTS "camera_measurements_member_modify" ON public.camera_measurements;

CREATE POLICY "camera_measurements_select" ON public.camera_measurements
  FOR SELECT USING (
    (SELECT is_internal())
    OR camera_id IN (SELECT id FROM cameras WHERE equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    ))
  );

CREATE POLICY "camera_measurements_modify" ON public.camera_measurements
  FOR ALL USING (
    (SELECT is_internal())
    OR camera_id IN (SELECT id FROM cameras WHERE equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    ))
  );

-- ===========================================
-- FIX: camera_plc_outputs table
-- ===========================================
DROP POLICY IF EXISTS "camera_plc_outputs_internal_all" ON public.camera_plc_outputs;
DROP POLICY IF EXISTS "camera_plc_outputs_external_select" ON public.camera_plc_outputs;
DROP POLICY IF EXISTS "camera_plc_outputs_member_modify" ON public.camera_plc_outputs;

CREATE POLICY "camera_plc_outputs_select" ON public.camera_plc_outputs
  FOR SELECT USING (
    (SELECT is_internal())
    OR camera_id IN (SELECT id FROM cameras WHERE equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    ))
  );

CREATE POLICY "camera_plc_outputs_modify" ON public.camera_plc_outputs
  FOR ALL USING (
    (SELECT is_internal())
    OR camera_id IN (SELECT id FROM cameras WHERE equipment_id IN (
      SELECT e.id FROM equipment e
      LEFT JOIN lines l ON l.id = e.line_id
      LEFT JOIN solutions_lines sl ON sl.id = e.solutions_line_id
      LEFT JOIN projects p ON p.id = l.project_id
      LEFT JOIN solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE p.company_id = (SELECT user_company_id()) OR sp.company_id = (SELECT user_company_id())
    ))
  );

-- ===========================================
-- FIX: subtasks table
-- ===========================================
DROP POLICY IF EXISTS "subtasks_select" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_insert" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_update" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_delete" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_internal_all" ON public.subtasks;

CREATE POLICY "subtasks_select" ON public.subtasks
  FOR SELECT USING ((SELECT can_access_subtask(task_id)));

CREATE POLICY "subtasks_insert" ON public.subtasks
  FOR INSERT WITH CHECK ((SELECT can_access_subtask(task_id)));

CREATE POLICY "subtasks_update" ON public.subtasks
  FOR UPDATE USING ((SELECT can_access_subtask(task_id)));

CREATE POLICY "subtasks_delete" ON public.subtasks
  FOR DELETE USING ((SELECT can_access_subtask(task_id)));

-- ===========================================
-- FIX: product_gaps table
-- ===========================================
DROP POLICY IF EXISTS "product_gaps_internal_all" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_select" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_insert" ON public.product_gaps;
DROP POLICY IF EXISTS "product_gaps_external_update" ON public.product_gaps;

CREATE POLICY "product_gaps_select" ON public.product_gaps
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "product_gaps_insert" ON public.product_gaps
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "product_gaps_update" ON public.product_gaps
  FOR UPDATE USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "product_gaps_delete" ON public.product_gaps
  FOR DELETE USING ((SELECT is_internal()));

-- ===========================================
-- FIX: implementation_blockers table
-- ===========================================
DROP POLICY IF EXISTS "implementation_blockers_internal_all" ON public.implementation_blockers;
DROP POLICY IF EXISTS "implementation_blockers_external_select" ON public.implementation_blockers;
DROP POLICY IF EXISTS "implementation_blockers_external_insert" ON public.implementation_blockers;
DROP POLICY IF EXISTS "implementation_blockers_external_update" ON public.implementation_blockers;

CREATE POLICY "implementation_blockers_select" ON public.implementation_blockers
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "implementation_blockers_insert" ON public.implementation_blockers
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "implementation_blockers_update" ON public.implementation_blockers
  FOR UPDATE USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "implementation_blockers_delete" ON public.implementation_blockers
  FOR DELETE USING ((SELECT is_internal()));

-- ===========================================
-- FIX: feature_requests table
-- ===========================================
DROP POLICY IF EXISTS "feature_requests_internal_all" ON public.feature_requests;
DROP POLICY IF EXISTS "feature_requests_authenticated_select" ON public.feature_requests;

CREATE POLICY "feature_requests_select" ON public.feature_requests
  FOR SELECT USING (
    (SELECT is_internal())
    OR created_by = (SELECT auth.uid())
  );

CREATE POLICY "feature_requests_modify" ON public.feature_requests
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: user_roles table
-- ===========================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Internal admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Internal admins can manage all roles" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (SELECT is_current_user_internal_admin())
  );

CREATE POLICY "user_roles_modify" ON public.user_roles
  FOR ALL USING ((SELECT is_current_user_internal_admin()));

-- ===========================================
-- FIX: vision_models table
-- ===========================================
DROP POLICY IF EXISTS "vision_models_internal_all" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_external_select" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_external_insert" ON public.vision_models;
DROP POLICY IF EXISTS "vision_models_external_update" ON public.vision_models;

CREATE POLICY "vision_models_select" ON public.vision_models
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "vision_models_modify" ON public.vision_models
  FOR ALL USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
    OR solutions_project_id IN (SELECT id FROM solutions_projects WHERE company_id = (SELECT user_company_id()))
  );

-- ===========================================
-- FIX: hardware_status_tracking table
-- ===========================================
DROP POLICY IF EXISTS "hardware_status_tracking_internal_all" ON public.hardware_status_tracking;
DROP POLICY IF EXISTS "hardware_status_tracking_external_select" ON public.hardware_status_tracking;
DROP POLICY IF EXISTS "hardware_status_tracking_external_insert" ON public.hardware_status_tracking;
DROP POLICY IF EXISTS "hardware_status_tracking_external_update" ON public.hardware_status_tracking;

CREATE POLICY "hardware_status_tracking_select" ON public.hardware_status_tracking
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "hardware_status_tracking_modify" ON public.hardware_status_tracking
  FOR ALL USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

-- ===========================================
-- FIX: expense_assignments table
-- ===========================================
DROP POLICY IF EXISTS "expense_assignments_read" ON public.expense_assignments;
DROP POLICY IF EXISTS "expense_assignments_update" ON public.expense_assignments;
DROP POLICY IF EXISTS "expense_assignments_insert" ON public.expense_assignments;
DROP POLICY IF EXISTS "expense_assignments_internal_all" ON public.expense_assignments;

CREATE POLICY "expense_assignments_select" ON public.expense_assignments
  FOR SELECT USING (
    (SELECT is_internal())
    OR assigned_to_user_id = (SELECT auth.uid())
    OR assigned_by = (SELECT auth.uid())
  );

CREATE POLICY "expense_assignments_insert" ON public.expense_assignments
  FOR INSERT WITH CHECK ((SELECT is_internal()));

CREATE POLICY "expense_assignments_update" ON public.expense_assignments
  FOR UPDATE USING (
    (SELECT is_internal())
    OR assigned_to_user_id = (SELECT auth.uid())
  );

CREATE POLICY "expense_assignments_delete" ON public.expense_assignments
  FOR DELETE USING ((SELECT is_internal()));

-- ===========================================
-- FIX: master_task_dependencies table
-- ===========================================
DROP POLICY IF EXISTS "master_task_dependencies_internal_all" ON public.master_task_dependencies;
DROP POLICY IF EXISTS "master_task_dependencies_external_select" ON public.master_task_dependencies;

CREATE POLICY "master_task_dependencies_select" ON public.master_task_dependencies
  FOR SELECT USING (true);

CREATE POLICY "master_task_dependencies_modify" ON public.master_task_dependencies
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: project_iot_requirements table
-- ===========================================
DROP POLICY IF EXISTS "iot_req_internal_all" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_select" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_insert" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_update" ON public.project_iot_requirements;
DROP POLICY IF EXISTS "iot_req_external_delete" ON public.project_iot_requirements;

CREATE POLICY "project_iot_requirements_select" ON public.project_iot_requirements
  FOR SELECT USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "project_iot_requirements_insert" ON public.project_iot_requirements
  FOR INSERT WITH CHECK (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "project_iot_requirements_update" ON public.project_iot_requirements
  FOR UPDATE USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

CREATE POLICY "project_iot_requirements_delete" ON public.project_iot_requirements
  FOR DELETE USING (
    (SELECT is_internal())
    OR project_id IN (SELECT id FROM projects WHERE company_id = (SELECT user_company_id()))
  );

-- ===========================================
-- FIX: hardware_master table
-- ===========================================
DROP POLICY IF EXISTS "hardware_master_internal_all" ON public.hardware_master;
DROP POLICY IF EXISTS "hardware_master_external_read" ON public.hardware_master;

CREATE POLICY "hardware_master_select" ON public.hardware_master
  FOR SELECT USING (true);

CREATE POLICY "hardware_master_modify" ON public.hardware_master
  FOR ALL USING ((SELECT is_internal()));

-- ===========================================
-- FIX: event_attendees table
-- ===========================================
DROP POLICY IF EXISTS "attendees_internal_all" ON public.event_attendees;
DROP POLICY IF EXISTS "attendees_external_select" ON public.event_attendees;
DROP POLICY IF EXISTS "attendees_external_insert" ON public.event_attendees;
DROP POLICY IF EXISTS "attendees_external_update" ON public.event_attendees;
DROP POLICY IF EXISTS "attendees_external_delete" ON public.event_attendees;

CREATE POLICY "event_attendees_select" ON public.event_attendees
  FOR SELECT USING (
    (SELECT is_internal())
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "event_attendees_modify" ON public.event_attendees
  FOR ALL USING (
    (SELECT is_internal())
    OR user_id = (SELECT auth.uid())
  );

-- ===========================================
-- FIX: project_task_updates table
-- ===========================================
DROP POLICY IF EXISTS "Internal users can manage task updates" ON public.project_task_updates;
DROP POLICY IF EXISTS "Internal users can view all task updates" ON public.project_task_updates;

CREATE POLICY "project_task_updates_select" ON public.project_task_updates
  FOR SELECT USING ((SELECT is_internal()));

CREATE POLICY "project_task_updates_modify" ON public.project_task_updates
  FOR ALL USING ((SELECT is_internal()));