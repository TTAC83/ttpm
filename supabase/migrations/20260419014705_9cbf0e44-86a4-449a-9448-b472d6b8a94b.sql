ALTER TABLE public.projects
  ADD COLUMN project_classification text
  CHECK (project_classification IS NULL OR project_classification IN ('Product','Project'));