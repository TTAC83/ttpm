
-- SOW versions table for version-controlled Statement of Work documents
CREATE TABLE public.sow_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solutions_project_id UUID NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'outdated', 'superseded')),
  sow_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  pdf_storage_path TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solutions_project_id, version)
);

-- Enable RLS
ALTER TABLE public.sow_versions ENABLE ROW LEVEL SECURITY;

-- Internal users can do everything
CREATE POLICY "Internal users can manage SOW versions"
ON public.sow_versions
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true)
);

-- Customer users can view SOW for their company's projects
CREATE POLICY "Customer users can view SOW versions"
ON public.sow_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.solutions_projects sp
    WHERE sp.id = solutions_project_id
    AND sp.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Index for fast lookups
CREATE INDEX idx_sow_versions_project ON public.sow_versions(solutions_project_id, is_current);
CREATE INDEX idx_sow_versions_project_version ON public.sow_versions(solutions_project_id, version DESC);
