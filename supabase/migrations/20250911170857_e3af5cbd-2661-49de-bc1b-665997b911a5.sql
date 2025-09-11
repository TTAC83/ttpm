-- Enhance RLS policies for profiles table to be more restrictive and secure
-- Current policies are actually secure, but let's add additional safeguards

-- First, let's add a policy to explicitly deny access to unauthenticated users
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.profiles;

CREATE POLICY "deny_anonymous_access"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add a more specific policy for regular users to only see minimal profile info of other users
-- when absolutely necessary (like in project member lists)
DROP POLICY IF EXISTS "users_can_see_basic_profile_info" ON public.profiles;

CREATE POLICY "users_can_see_basic_profile_info"  
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own full profile
  user_id = auth.uid()
  OR
  -- Users can see limited info of profiles that are in their company's projects
  (
    EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid() 
      AND pm2.user_id = profiles.user_id
    )
  )
);

-- Ensure internal admins can still access everything
-- (keeping existing policy)

-- Add audit logging for profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when someone accesses another user's profile
  IF auth.uid() != OLD.user_id THEN
    INSERT INTO public.audit_logs (
      entity_type,
      entity_id, 
      field,
      actor,
      old_value,
      new_value
    ) VALUES (
      'profile_access',
      OLD.user_id,
      'accessed_by',
      auth.uid(),
      null,
      to_jsonb(auth.uid())
    );
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS profile_access_audit ON public.profiles;
CREATE TRIGGER profile_access_audit
  AFTER SELECT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_access();