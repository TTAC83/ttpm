-- Create function to check if user has expense access
CREATE OR REPLACE FUNCTION public.has_expense_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    WHERE u.id = auth.uid() 
    AND u.email IN (
      'Agupta@thingtrax.com',
      'Paul@thingtrax.com', 
      'allan@thingtrax.com',
      'Ishafqat@thingtrax.com'
    )
  );
$$;

-- Drop existing policies for expenses table
DROP POLICY IF EXISTS "Internal users can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Internal users can view all expenses" ON public.expenses;

-- Create new restrictive policies for expenses
CREATE POLICY "Authorized users can manage expenses"
ON public.expenses
FOR ALL
USING (public.has_expense_access())
WITH CHECK (public.has_expense_access());

-- Drop existing policies for expense_assignments table  
DROP POLICY IF EXISTS "Internal users can manage assignments" ON public.expense_assignments;
DROP POLICY IF EXISTS "Internal users can view all assignments" ON public.expense_assignments;

-- Create new restrictive policies for expense_assignments
CREATE POLICY "Authorized users can manage assignments"
ON public.expense_assignments  
FOR ALL
USING (public.has_expense_access())
WITH CHECK (public.has_expense_access());