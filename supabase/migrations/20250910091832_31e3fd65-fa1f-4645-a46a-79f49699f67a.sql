-- Fix the remaining function search path issue

-- Update is_working_day function to add search_path
CREATE OR REPLACE FUNCTION public.is_working_day(d date)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  select extract(isodow from d) not in (6,7)
         and not exists (select 1 from public.uk_bank_holidays h where h.date = d);
$function$;