
-- =============================================
-- FIX 1: Drop the overly permissive attachments_all policy
-- The scoped policies (att_internal_all, att_external_select, etc.) already exist
-- =============================================
DROP POLICY IF EXISTS "attachments_all" ON public.attachments;

-- =============================================
-- FIX 2: Drop and recreate storage policies for attachments bucket
-- Replace any overly permissive authenticated policies with scoped ones
-- =============================================
DROP POLICY IF EXISTS "attachments_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "attachments_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "attachments_delete_authenticated" ON storage.objects;
-- Keep the existing internal-only policies (attachments_internal_*)

-- =============================================
-- FIX 3: Replace project_attributes policies with company-scoped access
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view project_attributes" ON public.project_attributes;
DROP POLICY IF EXISTS "Authenticated users can insert project_attributes" ON public.project_attributes;
DROP POLICY IF EXISTS "Authenticated users can update project_attributes" ON public.project_attributes;
DROP POLICY IF EXISTS "Authenticated users can delete project_attributes" ON public.project_attributes;

-- Internal users: full access
CREATE POLICY "pa_internal_all" ON public.project_attributes
  FOR ALL USING ((SELECT is_internal()));

-- External users: read attributes for their company's solutions projects
CREATE POLICY "pa_external_select" ON public.project_attributes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solutions_projects sp
      WHERE sp.id = project_attributes.solutions_project_id
        AND sp.company_id = (SELECT user_company_id())
    )
  );

-- =============================================
-- FIX 4: Replace solution portals/factories/shifts/groups/group_lines policies
-- =============================================

-- solution_portals
DROP POLICY IF EXISTS "Authenticated users can manage solution_portals" ON public.solution_portals;

CREATE POLICY "sp_internal_all" ON public.solution_portals
  FOR ALL USING ((SELECT is_internal()));

CREATE POLICY "sp_external_select" ON public.solution_portals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solutions_projects sp
      WHERE sp.id = solution_portals.solutions_project_id
        AND sp.company_id = (SELECT user_company_id())
    )
  );

-- solution_factories
DROP POLICY IF EXISTS "Authenticated users can manage solution_factories" ON public.solution_factories;

CREATE POLICY "sf_internal_all" ON public.solution_factories
  FOR ALL USING ((SELECT is_internal()));

CREATE POLICY "sf_external_select" ON public.solution_factories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solution_portals spo
      JOIN public.solutions_projects sp ON sp.id = spo.solutions_project_id
      WHERE spo.id = solution_factories.portal_id
        AND sp.company_id = (SELECT user_company_id())
    )
  );

-- factory_shifts
DROP POLICY IF EXISTS "Authenticated users can manage factory_shifts" ON public.factory_shifts;

CREATE POLICY "fs_internal_all" ON public.factory_shifts
  FOR ALL USING ((SELECT is_internal()));

CREATE POLICY "fs_external_select" ON public.factory_shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solution_factories sf
      JOIN public.solution_portals spo ON spo.id = sf.portal_id
      JOIN public.solutions_projects sp ON sp.id = spo.solutions_project_id
      WHERE sf.id = factory_shifts.factory_id
        AND sp.company_id = (SELECT user_company_id())
    )
  );

-- factory_groups
DROP POLICY IF EXISTS "Authenticated users can manage factory_groups" ON public.factory_groups;

CREATE POLICY "fg_internal_all" ON public.factory_groups
  FOR ALL USING ((SELECT is_internal()));

CREATE POLICY "fg_external_select" ON public.factory_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solution_factories sf
      JOIN public.solution_portals spo ON spo.id = sf.portal_id
      JOIN public.solutions_projects sp ON sp.id = spo.solutions_project_id
      WHERE sf.id = factory_groups.factory_id
        AND sp.company_id = (SELECT user_company_id())
    )
  );

-- factory_group_lines
DROP POLICY IF EXISTS "Authenticated users can manage factory_group_lines" ON public.factory_group_lines;

CREATE POLICY "fgl_internal_all" ON public.factory_group_lines
  FOR ALL USING ((SELECT is_internal()));

CREATE POLICY "fgl_external_select" ON public.factory_group_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.factory_groups fg
      JOIN public.solution_factories sf ON sf.id = fg.factory_id
      JOIN public.solution_portals spo ON spo.id = sf.portal_id
      JOIN public.solutions_projects sp ON sp.id = spo.solutions_project_id
      WHERE fg.id = factory_group_lines.group_id
        AND sp.company_id = (SELECT user_company_id())
    )
  );
