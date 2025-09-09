-- Fix the infinite recursion by completely restructuring the profiles policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles_internal_admin_read_all" ON public.profiles;

-- Create a much simpler policy structure that avoids recursion
-- Users can always read their own profile
CREATE POLICY "profiles_self_read_policy" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- For admin access, we'll handle this differently in the application layer
-- rather than trying to do it in RLS to avoid recursion issues