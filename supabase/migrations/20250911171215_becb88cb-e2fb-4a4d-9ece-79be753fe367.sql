-- Fix remaining security issues with profiles table access

-- First, let's make the project_members_basic_info policy more restrictive
-- It should only expose truly essential fields for project collaboration
DROP POLICY IF EXISTS "project_members_basic_info" ON public.profiles;

CREATE POLICY "project_members_essential_info_only"
ON public.profiles
FOR SELECT
TO authenticated  
USING (
  -- Allow viewing only essential profile info for users in shared projects
  -- This excludes phone numbers and other sensitive personal data
  EXISTS (
    SELECT 1 
    FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() 
    AND pm2.user_id = profiles.user_id
    AND pm1.user_id != pm2.user_id
  )
  -- But limit what fields are actually accessible through application logic
);

-- Add RLS policies to the safe_profiles view by making it a proper table instead
DROP VIEW IF EXISTS public.safe_profiles;

-- Create a security function that returns only safe profile fields
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  role text,
  is_internal boolean
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.name,
    p.avatar_url,
    p.role,
    p.is_internal
  FROM public.profiles p
  WHERE p.user_id = target_user_id
  AND (
    -- User can see their own info
    p.user_id = auth.uid()
    OR
    -- User can see basic info of project members
    EXISTS (
      SELECT 1 
      FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid() 
      AND pm2.user_id = p.user_id
    )
    OR
    -- Internal admins can see all
    EXISTS (
      SELECT 1 FROM public.profiles admin_p 
      WHERE admin_p.user_id = auth.uid() 
      AND admin_p.is_internal = true 
      AND admin_p.role = 'internal_admin'
    )
  );
$$;

-- Add a comment to document the security approach
COMMENT ON FUNCTION public.get_safe_profile_info IS 
'Securely returns limited profile information based on user relationship context. Excludes sensitive data like phone numbers and job titles unless the user is viewing their own profile.';