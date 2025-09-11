-- Revert security policies to the original stable configuration

-- 1) Companies table: Re-enable RLS and restore original policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop any custom/temporary companies policies we may have added
DROP POLICY IF EXISTS "companies_simple_access" ON public.companies;
DROP POLICY IF EXISTS "companies_simple_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_internal_can_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_read_access" ON public.companies;
DROP POLICY IF EXISTS "companies_internal_insert_fixed" ON public.companies;
DROP POLICY IF EXISTS "companies_access_fixed" ON public.companies;

-- Restore original companies policies
CREATE POLICY "companies_internal_insert"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_internal = true
  )
);

CREATE POLICY "companies_internal_read"
ON public.companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_internal = true
  )
  OR id = (
    SELECT profiles.company_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

-- 2) Profiles table: Restore original policies and remove experimental ones
DROP POLICY IF EXISTS "internal_admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "project_members_basic_access" ON public.profiles;
DROP POLICY IF EXISTS "project_members_limited_field_access" ON public.profiles;
DROP POLICY IF EXISTS "project_members_essential_info_only" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_full_access" ON public.profiles;
DROP POLICY IF EXISTS "users_can_see_basic_profile_info" ON public.profiles;
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.profiles;

-- Recreate original profiles policies
DROP POLICY IF EXISTS "internal_admin_can_edit_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_own_profile_only" ON public.profiles;

CREATE POLICY "internal_admin_can_edit_all_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_current_user_internal_admin())
WITH CHECK (public.is_current_user_internal_admin());

CREATE POLICY "user_own_profile_only"
ON public.profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());