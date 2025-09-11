-- Remove technology_scope from master_steps
ALTER TABLE public.master_steps 
DROP COLUMN IF EXISTS technology_scope;

-- Add technology_scope to master_tasks  
ALTER TABLE public.master_tasks 
ADD COLUMN technology_scope text NOT NULL DEFAULT 'both'
CHECK (technology_scope IN ('iot', 'vision', 'both'));

-- Set all existing tasks to 'both'
UPDATE public.master_tasks 
SET technology_scope = 'both';

-- Update snapshot_project_tasks function to filter by task technology_scope instead of step
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
      (p.domain = 'Hybrid' and mt.technology_scope in ('both', 'iot', 'vision')) or
      (p.domain = 'IoT' and mt.technology_scope in ('both', 'iot')) or
      (p.domain = 'Vision' and mt.technology_scope in ('both', 'vision'))
    );
$function$;