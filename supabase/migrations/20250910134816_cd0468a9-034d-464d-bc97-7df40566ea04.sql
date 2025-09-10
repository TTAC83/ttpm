-- Update the handle_new_user function to better handle the full_name extraction
-- and provide a fallback if full_name is empty
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
declare
  thingtrax_company uuid;
  user_full_name text;
begin
  select id into thingtrax_company
  from public.companies
  where is_internal = true
  order by created_at asc
  limit 1;

  -- Extract full_name from raw_user_meta_data, with fallback to email prefix
  user_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles(user_id, company_id, role, is_internal, name)
  values (
    new.id,
    case when new.email ilike '%@thingtrax.com' then thingtrax_company else null end,
    case when new.email ilike '%@thingtrax.com' then 'internal_user' else 'external_user' end,
    case when new.email ilike '%@thingtrax.com' then true else false end,
    user_full_name
  );
  return new;
end;
$$;