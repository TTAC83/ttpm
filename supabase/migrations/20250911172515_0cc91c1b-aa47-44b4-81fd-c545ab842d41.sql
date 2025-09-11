-- Clean up all existing companies policies and recreate them properly

-- Drop all existing policies
DROP POLICY IF EXISTS "companies_internal_insert_fixed" ON public.companies;
DROP POLICY IF EXISTS "companies_access_fixed" ON public.companies;

-- Create security definer function for user company lookup
CREATE OR REPLACE FUNCTION public.get_user_company_id_by_email(user_email text)
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

-- Create simple policies
CREATE POLICY "companies_internal_can_insert"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() LIKE '%@thingtrax.com'
);

CREATE POLICY "companies_read_access"
ON public.companies  
FOR SELECT
TO authenticated
USING (
  -- Internal users can see all companies
  auth.email() LIKE '%@thingtrax.com'
  OR
  -- Users can see their own company
  id = public.get_user_company_id_by_email(auth.email())
);