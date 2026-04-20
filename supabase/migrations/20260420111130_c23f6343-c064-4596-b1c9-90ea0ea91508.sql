ALTER TABLE public.bau_customers
  ADD COLUMN IF NOT EXISTS project_classification text
  CHECK (project_classification IS NULL OR project_classification IN ('Product','Project'));

UPDATE public.bau_customers
SET project_classification = 'Product'
WHERE project_classification IS NULL;