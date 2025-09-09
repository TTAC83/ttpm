-- Remove the insecure 'me' view that exposes auth.users without proper security
-- This fixes the "Exposed Auth Users" security vulnerability
DROP VIEW IF EXISTS public.me;

-- Ensure the profiles table continues to be the secure way to access user data
-- (profiles table already has proper RLS: user_own_profile_only policy)