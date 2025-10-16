-- Add solutions_project_id column to project_tasks table
ALTER TABLE project_tasks 
ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

-- Add check constraint to ensure either project_id or solutions_project_id is set
ALTER TABLE project_tasks
ADD CONSTRAINT project_tasks_project_xor CHECK (
  (project_id IS NOT NULL AND solutions_project_id IS NULL) OR
  (project_id IS NULL AND solutions_project_id IS NOT NULL)
);

-- Add potential_contract_start_date to solutions_projects table
ALTER TABLE solutions_projects 
ADD COLUMN potential_contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create function to snapshot project tasks for solutions projects
CREATE OR REPLACE FUNCTION snapshot_solutions_project_tasks(p_solutions_project_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Insert main tasks first
  WITH inserted_tasks AS (
    INSERT INTO public.project_tasks (
      solutions_project_id, master_task_id, step_name, task_title, task_details, planned_start, planned_end, assignee
    )
    SELECT 
      sp.id, 
      mt.id, 
      ms.name, 
      mt.title, 
      mt.details,
      public.add_working_days(sp.potential_contract_start_date, mt.planned_start_offset_days),
      public.add_working_days(sp.potential_contract_start_date, mt.planned_end_offset_days),
      CASE 
        WHEN mt.assigned_role = 'salesperson' THEN sp.salesperson
        WHEN mt.assigned_role = 'solutions_consultant' THEN sp.solutions_consultant
        ELSE NULL
      END
    FROM public.solutions_projects sp
    CROSS JOIN public.master_tasks mt
    JOIN public.master_steps ms ON ms.id = mt.step_id
    WHERE sp.id = p_solutions_project_id
      AND mt.parent_task_id IS NULL
      AND mt.technology_scope IN ('both', 'iot', 'vision')
    RETURNING id, master_task_id
  )
  INSERT INTO public.project_tasks (
    solutions_project_id, master_task_id, step_name, task_title, task_details, planned_start, planned_end, assignee, parent_task_id
  )
  SELECT 
    sp.id,
    sub_mt.id,
    ms.name,
    sub_mt.title,
    sub_mt.details,
    public.add_working_days(sp.potential_contract_start_date, sub_mt.planned_start_offset_days),
    public.add_working_days(sp.potential_contract_start_date, sub_mt.planned_end_offset_days),
    CASE 
      WHEN sub_mt.assigned_role = 'salesperson' THEN sp.salesperson
      WHEN sub_mt.assigned_role = 'solutions_consultant' THEN sp.solutions_consultant
      ELSE NULL
    END,
    it.id
  FROM public.solutions_projects sp
  CROSS JOIN public.master_tasks sub_mt
  JOIN public.master_steps ms ON ms.id = sub_mt.step_id
  JOIN inserted_tasks it ON it.master_task_id = sub_mt.parent_task_id
  WHERE sp.id = p_solutions_project_id
    AND sub_mt.parent_task_id IS NOT NULL
    AND sub_mt.technology_scope IN ('both', 'iot', 'vision');
$function$;

-- Create trigger function for solutions projects
CREATE OR REPLACE FUNCTION solutions_projects_after_insert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.snapshot_solutions_project_tasks(NEW.id);
  PERFORM public.copy_wbs_layout_for_project(NEW.id);
  RETURN NEW;
END;
$function$;

-- Create trigger on solutions_projects table
DROP TRIGGER IF EXISTS solutions_projects_after_insert ON solutions_projects;
CREATE TRIGGER solutions_projects_after_insert
  AFTER INSERT ON solutions_projects
  FOR EACH ROW
  EXECUTE FUNCTION solutions_projects_after_insert_trigger();