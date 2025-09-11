-- Add role assignment field to master_tasks
ALTER TABLE public.master_tasks 
ADD COLUMN assigned_role text;

-- Add check constraint for valid roles
ALTER TABLE public.master_tasks 
ADD CONSTRAINT master_tasks_assigned_role_check 
CHECK (assigned_role IS NULL OR assigned_role IN (
  'customer_project_lead', 
  'implementation_lead', 
  'ai_iot_engineer', 
  'project_coordinator', 
  'technical_project_lead'
));

-- Update snapshot_project_tasks function to auto-assign based on role
CREATE OR REPLACE FUNCTION public.snapshot_project_tasks(p_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  insert into public.project_tasks (
    project_id, master_task_id, step_name, task_title, task_details, planned_start, planned_end, assignee
  )
  select 
    p.id, 
    mt.id, 
    ms.name, 
    mt.title, 
    mt.details,
    public.add_working_days(p.contract_signed_date, mt.planned_start_offset_days),
    public.add_working_days(p.contract_signed_date, mt.planned_end_offset_days),
    CASE 
      WHEN mt.assigned_role = 'customer_project_lead' THEN p.customer_project_lead
      WHEN mt.assigned_role = 'implementation_lead' THEN p.implementation_lead
      WHEN mt.assigned_role = 'ai_iot_engineer' THEN p.ai_iot_engineer
      WHEN mt.assigned_role = 'project_coordinator' THEN p.project_coordinator
      WHEN mt.assigned_role = 'technical_project_lead' THEN p.technical_project_lead
      ELSE NULL
    END
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