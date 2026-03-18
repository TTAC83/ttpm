
-- Create junction table for linking master attributes to solutions projects
CREATE TABLE public.project_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id UUID NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  master_attribute_id UUID NOT NULL REFERENCES public.master_attributes(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (solutions_project_id, master_attribute_id)
);

-- Enable RLS
ALTER TABLE public.project_attributes ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users with internal access
CREATE POLICY "Authenticated users can view project_attributes"
  ON public.project_attributes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project_attributes"
  ON public.project_attributes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_attributes"
  ON public.project_attributes FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project_attributes"
  ON public.project_attributes FOR DELETE TO authenticated
  USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER set_project_attributes_updated_at
  BEFORE UPDATE ON public.project_attributes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
