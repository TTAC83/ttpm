-- Fix infinite recursion in companies RLS policies
-- Replace profile table references with email domain checks

-- Drop existing problematic policies
DROP POLICY IF EXISTS "companies_internal_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_internal_read" ON public.companies;

-- Create new policies using email domain instead of profiles table lookup
CREATE POLICY "companies_internal_insert_fixed"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  -- Internal users can insert companies (based on email domain)
  auth.email() LIKE '%@thingtrax.com'
);

-- For reading companies, we need a different approach since we can't easily determine
-- user's company without accessing profiles. Let's create a security definer function
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = (
    SELECT id FROM auth.users WHERE email = user_email
  );
$$;

CREATE POLICY "companies_access_fixed"
ON public.companies  
FOR SELECT
TO authenticated
USING (
  -- Internal users can see all companies
  auth.email() LIKE '%@thingtrax.com'
  OR
  -- Users can see their own company
  id = public.get_user_company_id(auth.email())
);