-- Fix infinite recursion in profiles RLS policies
-- First, create a security definer function to safely get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create function to check if user is internal
CREATE OR REPLACE FUNCTION public.is_current_user_internal()
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT COALESCE(is_internal, false) FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Drop existing problematic policy
DROP POLICY IF EXISTS "profiles_internal_read_all" ON public.profiles;

-- Recreate policy using security definer function
CREATE POLICY "profiles_internal_admin_read_all" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'internal_admin');

-- Also fix any other policies that might have similar issues
-- Check if there are any other RLS policies causing recursion
DROP POLICY IF EXISTS "projects_internal_all" ON public.projects;
CREATE POLICY "projects_internal_all" 
ON public.projects 
FOR ALL 
USING (public.is_current_user_internal());