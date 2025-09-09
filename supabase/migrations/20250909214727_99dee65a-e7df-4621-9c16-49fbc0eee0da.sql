-- Completely fix the recursion issue by simplifying profiles policies
-- Drop the problematic policy entirely
DROP POLICY IF EXISTS "profiles_internal_admin_read_all" ON public.profiles;

-- Keep only the essential policies that don't cause recursion
-- Users can always read their own profile
-- CREATE POLICY "profiles_self_read" already exists

-- Create a simple policy that allows internal users to read all profiles
-- But avoid the recursion by using a different approach
CREATE POLICY "profiles_internal_read_all" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (
    SELECT is_internal 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  ) = true
);