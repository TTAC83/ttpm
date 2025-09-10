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

-- Restrict invitations table access to only internal admins
DROP POLICY IF EXISTS "invitations_internal_all" ON public.invitations;

CREATE POLICY "invitations_internal_admin_only" 
ON public.invitations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

-- Make reference data tables read-only for most users, write access only for internal admins

-- UK Bank Holidays - read access for internal users, write access for internal admins only
DROP POLICY IF EXISTS "ukbh_internal_rw" ON public.uk_bank_holidays;

CREATE POLICY "ukbh_internal_read" 
ON public.uk_bank_holidays 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);

CREATE POLICY "ukbh_internal_admin_write" 
ON public.uk_bank_holidays 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

-- Master Steps - read access for internal users, write access for internal admins only
DROP POLICY IF EXISTS "ms_internal_rw" ON public.master_steps;

CREATE POLICY "ms_internal_read" 
ON public.master_steps 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);

CREATE POLICY "ms_internal_admin_write" 
ON public.master_steps 
FOR INSERT, UPDATE, DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

-- Master Tasks - read access for internal users, write access for internal admins only  
DROP POLICY IF EXISTS "mt_internal_rw" ON public.master_tasks;

CREATE POLICY "mt_internal_read" 
ON public.master_tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);

CREATE POLICY "mt_internal_admin_write" 
ON public.master_tasks 
FOR INSERT, UPDATE, DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);