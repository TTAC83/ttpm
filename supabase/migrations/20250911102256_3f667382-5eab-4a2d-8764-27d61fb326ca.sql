-- Drop the problematic policy first
DROP POLICY IF EXISTS "internal_admin_can_edit_all_profiles" ON public.profiles;

-- Create a security definer function to check if user is internal admin
CREATE OR REPLACE FUNCTION public.is_current_user_internal_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_internal, false) = true AND role = 'internal_admin'
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Add RLS policy to allow internal admins to edit any user's profile
CREATE POLICY "internal_admin_can_edit_all_profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (public.is_current_user_internal_admin())
WITH CHECK (public.is_current_user_internal_admin());