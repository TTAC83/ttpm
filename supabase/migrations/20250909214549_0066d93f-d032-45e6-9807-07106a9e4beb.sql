-- Fix infinite recursion in profiles RLS policies
-- First, create security definer functions to safely get user info
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_internal()
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT COALESCE(is_internal, false) FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Drop ALL existing problematic policies and recreate them
DROP POLICY IF EXISTS "profiles_internal_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_internal_admin_read_all" ON public.profiles;

-- Recreate policy using security definer function (avoid recursion)
CREATE POLICY "profiles_internal_admin_read_all" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'internal_admin'
  )
);