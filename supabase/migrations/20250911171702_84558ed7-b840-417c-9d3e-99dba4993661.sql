-- Fix infinite recursion in profiles RLS policies
-- The issue is that policies are referencing the profiles table from within profiles table policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "project_members_limited_field_access" ON public.profiles;
DROP POLICY IF EXISTS "internal_admin_can_edit_all_profiles" ON public.profiles;

-- Recreate the internal admin policy using the existing security definer function
CREATE POLICY "internal_admin_can_edit_all_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_current_user_internal_admin())
WITH CHECK (is_current_user_internal_admin());

-- Create a simpler project members policy without profile table references
CREATE POLICY "project_members_basic_access"
ON public.profiles
FOR SELECT
TO authenticated  
USING (
  -- Users can see their own profiles
  user_id = auth.uid()
  OR
  -- Project members can see basic info (controlled by application logic)
  EXISTS (
    SELECT 1 
    FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() 
    AND pm2.user_id = profiles.user_id
    AND pm1.user_id != pm2.user_id
  )
);