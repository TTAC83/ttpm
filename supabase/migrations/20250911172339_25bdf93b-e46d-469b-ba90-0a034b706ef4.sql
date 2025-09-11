-- Fix infinite recursion by simplifying the internal admin policy
-- The issue is that is_current_user_internal_admin() queries profiles table from within profiles RLS

-- Drop the problematic policy
DROP POLICY IF EXISTS "internal_admin_can_edit_all_profiles" ON public.profiles;

-- Create a simpler version that doesn't reference profiles table 
-- This won't provide internal admin access until we create a proper solution
-- but it will fix the infinite recursion issue

-- For now, just allow users their own profiles and project member basic access
-- Internal admins will need to be handled differently