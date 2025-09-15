-- Update the expense access function to include the exact users specified
CREATE OR REPLACE FUNCTION public.has_expense_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN (
      'allan@thingtrax.com',
      'paul@thingtrax.com', 
      'ishafqat@thingtrax.com',
      'agupta@thingtrax.com',
      'richard@thingtrax.com'
    )
  );
$function$;