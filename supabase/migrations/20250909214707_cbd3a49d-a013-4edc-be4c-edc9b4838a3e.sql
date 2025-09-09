-- Clean up all profiles policies and create non-recursive ones
DROP POLICY IF EXISTS "profiles_internal_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Create clean, non-recursive policies
-- 1. Users can read their own profile
CREATE POLICY "profiles_own_select" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "profiles_own_update" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- 3. No recursive admin policy - we'll handle admin access in the app layer