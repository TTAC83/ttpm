
-- Create security definer function to check if user's company matches project
CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
    AND (
      p.company_id = user_company_id()
      OR is_internal()
    )
  )
$$;

-- Drop all existing projects policies
DROP POLICY IF EXISTS "projects_external_delete" ON projects;
DROP POLICY IF EXISTS "projects_external_insert" ON projects;
DROP POLICY IF EXISTS "projects_external_select" ON projects;
DROP POLICY IF EXISTS "projects_external_update" ON projects;
DROP POLICY IF EXISTS "projects_internal_all" ON projects;
DROP POLICY IF EXISTS "projects_all" ON projects;
DROP POLICY IF EXISTS "projects_modify" ON projects;
DROP POLICY IF EXISTS "projects_select" ON projects;

-- Create new non-recursive policies
-- Internal users: full access
CREATE POLICY "projects_internal_all" ON projects
FOR ALL
TO public
USING ((SELECT is_internal()))
WITH CHECK ((SELECT is_internal()));

-- External users: SELECT their company's projects
CREATE POLICY "projects_external_select" ON projects
FOR SELECT
TO public
USING (company_id = (SELECT user_company_id()));

-- External users: INSERT for their company
CREATE POLICY "projects_external_insert" ON projects
FOR INSERT
TO public
WITH CHECK (company_id = (SELECT user_company_id()));

-- External users: UPDATE their company's projects
CREATE POLICY "projects_external_update" ON projects
FOR UPDATE
TO public
USING (company_id = (SELECT user_company_id()))
WITH CHECK (company_id = (SELECT user_company_id()));

-- External users: DELETE their company's projects
CREATE POLICY "projects_external_delete" ON projects
FOR DELETE
TO public
USING (company_id = (SELECT user_company_id()));
