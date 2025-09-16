-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create security definer function to check if user is a project member
CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM project_members pm 
    WHERE pm.project_id = $1 AND pm.user_id = $2
  );
$$;

-- Create security definer function to get user's company projects
CREATE OR REPLACE FUNCTION public.get_user_company_projects()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pr.id
  FROM projects pr
  WHERE pr.company_id = (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "projects_external_update" ON public.projects;
DROP POLICY IF EXISTS "pm_external_select" ON public.project_members;

-- Recreate projects update policy using security definer function
CREATE POLICY "projects_external_update" 
ON public.projects 
FOR UPDATE 
USING (public.is_project_member(projects.id));

-- Recreate project_members select policy using security definer function
CREATE POLICY "pm_external_select" 
ON public.project_members 
FOR SELECT 
USING (project_id IN (SELECT public.get_user_company_projects()));