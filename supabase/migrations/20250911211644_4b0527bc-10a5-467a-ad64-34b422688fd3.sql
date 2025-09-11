-- Update snapshot_project_tasks function to filter by domain and technology scope
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
  where p.id = p_project_id
    and (
      (p.domain = 'Hybrid' and ms.technology_scope in ('both', 'iot', 'vision')) or
      (p.domain = 'IoT' and ms.technology_scope in ('both', 'iot')) or
      (p.domain = 'Vision' and ms.technology_scope in ('both', 'vision'))
    );
$function$;