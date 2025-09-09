-- Force refresh of RLS policies by temporarily disabling and re-enabling
-- This will clear any cached problematic policies

-- Temporarily disable RLS on profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify our simplified policy is the only one
DROP POLICY IF EXISTS "profiles_own_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;

-- Ensure we only have our clean policy
CREATE POLICY "profiles_simple_access" 
ON public.profiles 
FOR ALL 
USING (user_id = auth.uid());