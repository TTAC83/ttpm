
-- Master attributes catalog
CREATE TABLE public.master_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('decimal', 'date', 'alphanumeric', 'julian_date')),
  unit_of_measure TEXT,
  validation_type TEXT NOT NULL DEFAULT 'single_value' CHECK (validation_type IN ('single_value', 'multiple_values', 'range')),
  default_value TEXT,
  min_value TEXT,
  max_value TEXT,
  apply_min_max_date BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at using existing function
CREATE TRIGGER set_master_attributes_updated_at
  BEFORE UPDATE ON public.master_attributes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.master_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_attributes_select" ON public.master_attributes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_attributes_insert" ON public.master_attributes
  FOR INSERT TO authenticated WITH CHECK (is_internal());

CREATE POLICY "master_attributes_update" ON public.master_attributes
  FOR UPDATE TO authenticated USING (is_internal()) WITH CHECK (is_internal());

CREATE POLICY "master_attributes_delete" ON public.master_attributes
  FOR DELETE TO authenticated USING (is_internal());
