-- Fix Function Search Path Mutable warnings by setting search_path for all functions

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  thingtrax_company uuid;
begin
  select id into thingtrax_company
  from public.companies
  where is_internal = true
  order by created_at asc
  limit 1;

  insert into public.profiles(user_id, company_id, role, is_internal, name)
  values (
    new.id,
    case when new.email ilike '%@thingtrax.com' then thingtrax_company else null end,
    case when new.email ilike '%@thingtrax.com' then 'internal_user' else 'external_user' end,
    case when new.email ilike '%@thingtrax.com' then true else false end,
    split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email),'@',1)
  );
  return new;
end $function$;

-- Update get_current_user_role function  
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Update is_current_user_internal function
CREATE OR REPLACE FUNCTION public.is_current_user_internal()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(is_internal, false) FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Update projects_after_insert_trigger function
CREATE OR REPLACE FUNCTION public.projects_after_insert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  perform public.snapshot_project_tasks(new.id);
  return new;
end $function$;