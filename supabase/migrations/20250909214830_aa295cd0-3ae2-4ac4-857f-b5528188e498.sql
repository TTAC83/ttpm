-- Completely remove all problematic policies and recreate them properly
-- Remove ALL existing policies on profiles table
DROP POLICY IF EXISTS "profiles_internal_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Create simple, non-recursive policies
-- 1. Users can always read and update their own profile
CREATE POLICY "profiles_own_access" 
ON public.profiles 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. For internal admin access, use a completely separate approach
-- We'll handle admin access at the application level instead of RLS level
-- This avoids any potential recursion issues