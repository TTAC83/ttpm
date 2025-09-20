-- Add parent_task_id to master_tasks for sub-task hierarchy
ALTER TABLE public.master_tasks 
ADD COLUMN parent_task_id INTEGER REFERENCES public.master_tasks(id) ON DELETE CASCADE;

-- Add parent_task_id to project_tasks for sub-task hierarchy  
ALTER TABLE public.project_tasks
ADD COLUMN parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE;

-- Add indexes for better performance on hierarchical queries
CREATE INDEX idx_master_tasks_parent ON public.master_tasks(parent_task_id);
CREATE INDEX idx_project_tasks_parent ON public.project_tasks(parent_task_id);

-- Update the snapshot_project_tasks function to handle sub-tasks
CREATE OR REPLACE FUNCTION public.snapshot_project_tasks(p_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Insert main tasks first
  WITH inserted_tasks AS (
    INSERT INTO public.project_tasks (
      project_id, master_task_id, step_name, task_title, task_details, planned_start, planned_end, assignee
    )
    SELECT 
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
    FROM public.projects p
    CROSS JOIN public.master_tasks mt
    JOIN public.master_steps ms ON ms.id = mt.step_id
    WHERE p.id = p_project_id
      AND mt.parent_task_id IS NULL  -- Only main tasks first
      AND (
        (p.domain = 'Hybrid' AND mt.technology_scope IN ('both', 'iot', 'vision')) OR
        (p.domain = 'IoT' AND mt.technology_scope IN ('both', 'iot')) OR
        (p.domain = 'Vision' AND mt.technology_scope IN ('both', 'vision'))
      )
    RETURNING id, master_task_id
  )
  -- Then insert sub-tasks with proper parent references
  INSERT INTO public.project_tasks (
    project_id, master_task_id, step_name, task_title, task_details, planned_start, planned_end, assignee, parent_task_id
  )
  SELECT 
    p.id,
    sub_mt.id,
    ms.name,
    sub_mt.title,
    sub_mt.details,
    public.add_working_days(p.contract_signed_date, sub_mt.planned_start_offset_days),
    public.add_working_days(p.contract_signed_date, sub_mt.planned_end_offset_days),
    CASE 
      WHEN sub_mt.assigned_role = 'customer_project_lead' THEN p.customer_project_lead
      WHEN sub_mt.assigned_role = 'implementation_lead' THEN p.implementation_lead
      WHEN sub_mt.assigned_role = 'ai_iot_engineer' THEN p.ai_iot_engineer
      WHEN sub_mt.assigned_role = 'project_coordinator' THEN p.project_coordinator
      WHEN sub_mt.assigned_role = 'technical_project_lead' THEN p.technical_project_lead
      ELSE NULL
    END,
    it.id  -- Reference to the parent project task
  FROM public.projects p
  CROSS JOIN public.master_tasks sub_mt
  JOIN public.master_steps ms ON ms.id = sub_mt.step_id
  JOIN inserted_tasks it ON it.master_task_id = sub_mt.parent_task_id
  WHERE p.id = p_project_id
    AND sub_mt.parent_task_id IS NOT NULL  -- Only sub-tasks
    AND (
      (p.domain = 'Hybrid' AND sub_mt.technology_scope IN ('both', 'iot', 'vision')) OR
      (p.domain = 'IoT' AND sub_mt.technology_scope IN ('both', 'iot')) OR
      (p.domain = 'Vision' AND sub_mt.technology_scope IN ('both', 'vision'))
    );
$function$;