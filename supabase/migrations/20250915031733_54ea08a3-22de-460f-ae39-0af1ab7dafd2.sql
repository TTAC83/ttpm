-- Fix security issues with SECURITY DEFINER functions
-- Only keep SECURITY DEFINER where absolutely necessary

-- Update get_current_user_role to SECURITY INVOKER since it only accesses data the user should have access to
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Add comments to document why certain functions legitimately need SECURITY DEFINER
COMMENT ON FUNCTION public.auth_user_id() IS 'SECURITY DEFINER required: Provides consistent access to auth.uid() across security contexts';
COMMENT ON FUNCTION public.is_internal() IS 'SECURITY DEFINER required: Security helper function that must work uniformly';
COMMENT ON FUNCTION public.user_company_id() IS 'SECURITY DEFINER required: Security helper function used in RLS policies';
COMMENT ON FUNCTION public.has_expense_access() IS 'SECURITY DEFINER required: Needs to access auth.users table for email-based authorization';
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: Trigger function that creates user profiles automatically';
COMMENT ON FUNCTION public.get_all_users_with_profiles() IS 'SECURITY DEFINER required: Admin function that needs to access all user data';
COMMENT ON FUNCTION public.get_safe_profile_info(uuid) IS 'SECURITY DEFINER required: Controlled data exposure function with built-in access control';