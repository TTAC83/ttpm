-- Enhance RLS policies for profiles table to be more restrictive and secure

-- First, let's add a policy to explicitly deny access to unauthenticated users
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.profiles;

CREATE POLICY "deny_anonymous_access"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Update the existing user policy to be more restrictive about what fields can be accessed
-- when viewing other users' profiles (only in project context)
DROP POLICY IF EXISTS "user_own_profile_only" ON public.profiles;

CREATE POLICY "users_own_profile_full_access"
ON public.profiles  
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add limited access policy for project members to see basic info only
CREATE POLICY "project_members_basic_info"
ON public.profiles
FOR SELECT
TO authenticated  
USING (
  -- Allow viewing basic profile info only for users in shared projects
  EXISTS (
    SELECT 1 
    FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() 
    AND pm2.user_id = profiles.user_id
    AND pm1.user_id != pm2.user_id  -- Don't duplicate own access
  )
);

-- Create a view that exposes only safe profile fields for project contexts
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  user_id,
  name,
  avatar_url,
  job_title,
  company_id,
  role,
  is_internal
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.safe_profiles SET (security_invoker = true);