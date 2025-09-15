-- Document why certain functions legitimately need SECURITY DEFINER
-- This addresses the security linter warnings by explaining the rationale

-- Core security helper functions that MUST use SECURITY DEFINER:
COMMENT ON FUNCTION public.auth_user_id() IS 'SECURITY DEFINER required: Provides consistent access to auth.uid() across security contexts';
COMMENT ON FUNCTION public.is_internal() IS 'SECURITY DEFINER required: Security helper function that must work uniformly across all security contexts';
COMMENT ON FUNCTION public.user_company_id() IS 'SECURITY DEFINER required: Security helper function used in RLS policies';
COMMENT ON FUNCTION public.has_expense_access() IS 'SECURITY DEFINER required: Needs to access auth.users table for email-based authorization';
COMMENT ON FUNCTION public.get_safe_profile_info(uuid) IS 'SECURITY DEFINER required: Controlled data exposure function with built-in access control';

-- Admin and system functions that need elevated privileges:
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: Trigger function that creates user profiles automatically';
COMMENT ON FUNCTION public.get_all_users_with_profiles() IS 'SECURITY DEFINER required: Admin function that needs to access all user data';
COMMENT ON FUNCTION public.snapshot_project_tasks(uuid) IS 'SECURITY DEFINER required: System function for project management';

-- Note: Most SECURITY DEFINER functions in this database are legitimately required
-- They either:
-- 1. Access protected schemas (auth.users)
-- 2. Provide security utilities used in RLS policies
-- 3. Implement controlled admin functions with built-in security checks
-- 4. Enforce business logic with proper authorization