
-- Create table for customer-facing prices on solutions hardware
CREATE TABLE public.solutions_hardware_customer_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solutions_project_id UUID NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  hardware_master_id UUID NOT NULL REFERENCES public.hardware_master(id) ON DELETE CASCADE,
  customer_price_gbp NUMERIC NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (solutions_project_id, hardware_master_id)
);

-- Enable RLS
ALTER TABLE public.solutions_hardware_customer_prices ENABLE ROW LEVEL SECURITY;

-- SELECT: internal users can read
CREATE POLICY "Internal users can read customer prices"
  ON public.solutions_hardware_customer_prices
  FOR SELECT
  USING (public.is_internal());

-- INSERT: only the salesperson on the project
CREATE POLICY "Salesperson can insert customer prices"
  ON public.solutions_hardware_customer_prices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solutions_projects sp
      WHERE sp.id = solutions_project_id
        AND sp.salesperson = auth.uid()
    )
  );

-- UPDATE: only the salesperson on the project
CREATE POLICY "Salesperson can update customer prices"
  ON public.solutions_hardware_customer_prices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.solutions_projects sp
      WHERE sp.id = solutions_project_id
        AND sp.salesperson = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.solutions_hardware_customer_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();
