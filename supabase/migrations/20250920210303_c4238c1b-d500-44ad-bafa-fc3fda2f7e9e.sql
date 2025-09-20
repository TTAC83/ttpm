-- Work Breakdown Structure layouts table
CREATE TABLE IF NOT EXISTS public.wbs_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  pos_x INTEGER NOT NULL DEFAULT 0,
  pos_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, step_name)
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.touch_wbs_updated_at() 
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_wbs_layouts_touch ON public.wbs_layouts;
CREATE TRIGGER trg_wbs_layouts_touch
BEFORE UPDATE ON public.wbs_layouts
FOR EACH ROW EXECUTE PROCEDURE public.touch_wbs_updated_at();

-- Enable RLS
ALTER TABLE public.wbs_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS wbs_read ON public.wbs_layouts;
CREATE POLICY wbs_read ON public.wbs_layouts
FOR SELECT USING (
  is_internal()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.user_id = auth.uid()
    WHERE p.id = wbs_layouts.project_id
      AND pr.company_id = p.company_id
  )
);

DROP POLICY IF EXISTS wbs_upsert ON public.wbs_layouts;
CREATE POLICY wbs_upsert ON public.wbs_layouts
FOR INSERT WITH CHECK (
  is_internal()
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = wbs_layouts.project_id AND pm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS wbs_update ON public.wbs_layouts;
CREATE POLICY wbs_update ON public.wbs_layouts
FOR UPDATE USING (
  is_internal()
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = wbs_layouts.project_id AND pm.user_id = auth.uid()
  )
) WITH CHECK (true);

-- View for project steps
CREATE OR REPLACE VIEW public.v_project_steps AS
SELECT
  t.project_id,
  t.step_name,
  COUNT(*) as task_count
FROM public.project_tasks t
GROUP BY t.project_id, t.step_name;