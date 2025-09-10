-- Fix remaining function search path issues by updating specific functions

-- Update add_working_days function
CREATE OR REPLACE FUNCTION public.add_working_days(start_date date, n integer)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
declare
  counter int := 0;
  cur date := start_date;
begin
  if n = 0 then
    return case when public.is_working_day(cur) then cur
                else (select d::date
                      from generate_series(cur, cur + interval '14 day', interval '1 day') s(d)
                      where public.is_working_day(s.d::date)
                      limit 1) end;
  end if;

  if n > 0 then
    while counter < n loop
      cur := cur + 1;
      if public.is_working_day(cur) then counter := counter + 1; end if;
    end loop;
  else
    while counter > n loop
      cur := cur - 1;
      if public.is_working_day(cur) then counter := counter - 1; end if;
    end loop;
  end if;
  return cur;
end $function$;

-- Update snapshot_project_tasks function
CREATE OR REPLACE FUNCTION public.snapshot_project_tasks(p_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  insert into public.project_tasks (
    project_id, master_task_id, step_name, task_title, task_details, planned_start, planned_end
  )
  select p.id, mt.id, ms.name, mt.title, mt.details,
         public.add_working_days(p.contract_signed_date, mt.planned_start_offset_days),
         public.add_working_days(p.contract_signed_date, mt.planned_end_offset_days)
  from public.projects p
  cross join public.master_tasks mt
  join public.master_steps ms on ms.id = mt.step_id
  where p.id = p_project_id;
$function$;