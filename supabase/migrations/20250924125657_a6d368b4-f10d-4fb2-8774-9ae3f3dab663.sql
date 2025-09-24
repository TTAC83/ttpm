-- Update expense access functions to include will@thingtrax.com

CREATE OR REPLACE FUNCTION public.has_expense_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN (
      'allan@thingtrax.com',
      'paul@thingtrax.com', 
      'ishafqat@thingtrax.com',
      'agupta@thingtrax.com',
      'richard@thingtrax.com',
      'will@thingtrax.com'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_expense_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN (
      'allan@thingtrax.com',
      'paul@thingtrax.com', 
      'ishafqat@thingtrax.com',
      'agupta@thingtrax.com',
      'richard@thingtrax.com',
      'will@thingtrax.com'
    )
  );
$$;