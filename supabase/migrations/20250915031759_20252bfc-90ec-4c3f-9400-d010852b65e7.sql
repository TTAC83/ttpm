-- Fix security issues with SECURITY DEFINER functions
-- Convert functions to SECURITY INVOKER where safe to do so

-- Update get_current_user_role to SECURITY INVOKER 
-- This function only reads from profiles table with user's own data
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Add documentation comments for functions that legitimately need SECURITY DEFINER
COMMENT ON FUNCTION public.auth_user_id() IS 'SECURITY DEFINER required: Provides consistent access to auth.uid() across security contexts';
COMMENT ON FUNCTION public.is_internal() IS 'SECURITY DEFINER required: Security helper function that must work uniformly across all security contexts';
COMMENT ON FUNCTION public.user_company_id() IS 'SECURITY DEFINER required: Security helper function used in RLS policies';
COMMENT ON FUNCTION public.has_expense_access() IS 'SECURITY DEFINER required: Needs to access auth.users table for email-based authorization';
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: Trigger function that creates user profiles automatically';
COMMENT ON FUNCTION public.get_all_users_with_profiles() IS 'SECURITY DEFINER required: Admin function that needs to access all user data';
COMMENT ON FUNCTION public.get_safe_profile_info() IS 'SECURITY DEFINER required: Controlled data exposure function with built-in access control';

-- Business logic functions that enforce security rules and need SECURITY DEFINER:
COMMENT ON FUNCTION public.expense_admin_signoff(uuid, boolean) IS 'SECURITY DEFINER required: Admin function with security enforcement';
COMMENT ON FUNCTION public.expense_confirm(uuid, text, boolean, expense_category_enum, text, boolean, text, uuid) IS 'SECURITY DEFINER required: Business logic with security enforcement';
COMMENT ON FUNCTION public.bau_create_customer(uuid, text, text, text, integer, integer) IS 'SECURITY DEFINER required: Business logic with security enforcement';
COMMENT ON FUNCTION public.snapshot_project_tasks(uuid) IS 'SECURITY DEFINER required: System function for project management';