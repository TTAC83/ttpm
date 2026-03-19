
-- Product-level attribute configuration (which attributes apply, set vs variable)
CREATE TABLE public.product_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  project_attribute_id UUID NOT NULL REFERENCES public.project_attributes(id) ON DELETE CASCADE,
  is_variable BOOLEAN NOT NULL DEFAULT false,
  fixed_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, project_attribute_id)
);

-- Enable RLS
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

-- Internal users full access
CREATE POLICY "Internal users full access on product_attributes"
  ON public.product_attributes
  FOR ALL
  TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

-- Company members can view product attributes for their projects
CREATE POLICY "Company members can view product_attributes"
  ON public.product_attributes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE p.id = product_attributes.product_id
        AND sp.company_id = user_company_id()
    )
  );

-- Timestamp trigger
CREATE TRIGGER set_product_attributes_updated_at
  BEFORE UPDATE ON public.product_attributes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();
