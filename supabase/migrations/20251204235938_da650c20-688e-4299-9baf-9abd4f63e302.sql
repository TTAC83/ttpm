-- Create table for per-project hardware price overrides
CREATE TABLE IF NOT EXISTS public.project_hardware_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hardware_master_id UUID NOT NULL REFERENCES public.hardware_master(id) ON DELETE CASCADE,
  price_gbp NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_hardware_price UNIQUE (project_id, hardware_master_id)
);

-- Enable Row Level Security
ALTER TABLE public.project_hardware_prices ENABLE ROW LEVEL SECURITY;

-- Internal users: full access
CREATE POLICY project_hardware_prices_internal_all
ON public.project_hardware_prices
FOR ALL
USING (is_internal())
WITH CHECK (is_internal());

-- Project members (external users) can manage prices for their projects
CREATE POLICY project_hardware_prices_project_members
ON public.project_hardware_prices
FOR ALL
USING (
  project_id IN (
    SELECT pm.project_id
    FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT pm.project_id
    FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
  )
);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_hardware_prices_updated_at ON public.project_hardware_prices;
CREATE TRIGGER set_project_hardware_prices_updated_at
BEFORE UPDATE ON public.project_hardware_prices
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp_updated_at();