-- Fix security issues by documenting legitimate SECURITY DEFINER usage
-- Only convert functions that are safe to change

-- Convert get_current_user_role to SECURITY INVOKER since it only reads user's own profile data
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Document why critical functions need SECURITY DEFINER
COMMENT ON FUNCTION public.auth_user_id() IS 'SECURITY DEFINER required: Provides consistent access to auth.uid()';
COMMENT ON FUNCTION public.is_internal() IS 'SECURITY DEFINER required: Security helper used in RLS policies';
COMMENT ON FUNCTION public.user_company_id() IS 'SECURITY DEFINER required: Security helper used in RLS policies';
COMMENT ON FUNCTION public.has_expense_access() IS 'SECURITY DEFINER required: Accesses auth.users for email-based authorization';
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: Trigger function for automatic profile creation';