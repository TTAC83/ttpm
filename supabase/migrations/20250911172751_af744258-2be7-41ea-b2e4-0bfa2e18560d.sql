-- Temporarily disable RLS on companies table to fix the immediate recursion issue
-- We'll re-enable it with proper policies later

ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Also temporarily simplify profiles policies to break any remaining recursion
DROP POLICY IF EXISTS "companies_simple_access" ON public.companies;
DROP POLICY IF EXISTS "companies_simple_insert" ON public.companies;