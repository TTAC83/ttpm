-- Update WBS layouts to be generic (not project-specific)
ALTER TABLE public.wbs_layouts 
DROP CONSTRAINT IF EXISTS wbs_layouts_project_id_step_name_key;

ALTER TABLE public.wbs_layouts 
DROP COLUMN IF EXISTS project_id;

-- Add constraint for unique step layouts
ALTER TABLE public.wbs_layouts 
ADD CONSTRAINT wbs_layouts_step_name_key UNIQUE (step_name);

-- Update RLS policies for generic access
DROP POLICY IF EXISTS wbs_read ON public.wbs_layouts;
CREATE POLICY wbs_read ON public.wbs_layouts
FOR SELECT USING (true); -- Allow all users to read master layout

DROP POLICY IF EXISTS wbs_upsert ON public.wbs_layouts;
CREATE POLICY wbs_upsert ON public.wbs_layouts
FOR INSERT WITH CHECK (is_internal());

DROP POLICY IF EXISTS wbs_update ON public.wbs_layouts;
CREATE POLICY wbs_update ON public.wbs_layouts
FOR UPDATE USING (is_internal()) WITH CHECK (is_internal());

-- Update view for master steps
DROP VIEW IF EXISTS public.v_project_steps;
CREATE OR REPLACE VIEW public.v_master_steps AS
SELECT
  ms.id,
  ms.name as step_name,
  ms.position,
  COUNT(mt.id) as task_count
FROM public.master_steps ms
LEFT JOIN public.master_tasks mt ON mt.step_id = ms.id
GROUP BY ms.id, ms.name, ms.position
ORDER BY ms.position;