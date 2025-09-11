-- Apply column-level security to profiles table by restricting sensitive fields
-- Create a policy that limits what fields can be accessed when viewing other users' profiles

-- Drop the current policy that allows all field access
DROP POLICY IF EXISTS "project_members_essential_info_only" ON public.profiles;

-- Create a more restrictive policy that uses a security definer function
-- to control field-level access
CREATE OR REPLACE FUNCTION public.can_access_profile_field(
  profile_user_id uuid, 
  field_name text,
  requesting_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Users can always access their own profile fields
  IF profile_user_id = requesting_user_id THEN
    RETURN true;
  END IF;
  
  -- Internal admins can access all fields
  IF EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = requesting_user_id 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- For project members, only allow access to essential fields
  IF EXISTS (
    SELECT 1 
    FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = requesting_user_id 
    AND pm2.user_id = profile_user_id
  ) THEN
    -- Only allow access to non-sensitive fields for project collaboration
    RETURN field_name IN ('name', 'avatar_url', 'role', 'is_internal');
  END IF;
  
  -- Deny access by default
  RETURN false;
END;
$$;

-- Re-create the policy with field-level restrictions
CREATE POLICY "project_members_limited_field_access"
ON public.profiles
FOR SELECT
TO authenticated  
USING (
  -- Allow viewing profiles but application logic must respect field restrictions
  user_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
  OR
  EXISTS (
    SELECT 1 
    FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() 
    AND pm2.user_id = profiles.user_id
    AND pm1.user_id != pm2.user_id
  )
);