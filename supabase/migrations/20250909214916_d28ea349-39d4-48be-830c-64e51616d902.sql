-- Get a completely fresh start with profiles RLS
-- Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Now create one simple, clean policy
CREATE POLICY "user_own_profile_only" 
ON public.profiles 
FOR ALL 
USING (user_id = auth.uid());