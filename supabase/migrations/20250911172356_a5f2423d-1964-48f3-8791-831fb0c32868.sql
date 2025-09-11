-- Create internal admin policy using email domain instead of profiles table lookup
-- This avoids infinite recursion since it uses auth.users directly

CREATE POLICY "internal_admin_full_access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  -- Allow internal admin access based on email domain
  -- Internal admins are users with @thingtrax.com emails
  auth.email() LIKE '%@thingtrax.com'
)
WITH CHECK (
  auth.email() LIKE '%@thingtrax.com'
);