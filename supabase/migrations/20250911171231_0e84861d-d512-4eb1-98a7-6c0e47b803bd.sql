-- Remove the safe_profiles view and replace with secure function
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