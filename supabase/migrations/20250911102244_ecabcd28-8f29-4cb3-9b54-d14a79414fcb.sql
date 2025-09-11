-- Add RLS policy to allow internal admins to edit any user's profile
CREATE POLICY "internal_admin_can_edit_all_profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.is_internal = true 
    AND admin_profile.role = 'internal_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.is_internal = true 
    AND admin_profile.role = 'internal_admin'
  )
);