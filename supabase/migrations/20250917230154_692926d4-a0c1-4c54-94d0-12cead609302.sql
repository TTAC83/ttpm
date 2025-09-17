-- Create product_gaps table
CREATE TABLE public.product_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ticket_link TEXT,
  assigned_to UUID,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Live' CHECK (status IN ('Live', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  estimated_complete_date DATE,
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_gaps ENABLE ROW LEVEL SECURITY;

-- Create policies for internal users only
CREATE POLICY "product_gaps_internal_all" 
ON public.product_gaps 
FOR ALL 
USING (is_internal())
WITH CHECK (is_internal());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_product_gaps_updated_at
BEFORE UPDATE ON public.product_gaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create validation trigger for closing product gaps
CREATE OR REPLACE FUNCTION public.product_gaps_validate_close()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'Closed' THEN
    IF COALESCE(NEW.resolution_notes, '') = '' THEN
      RAISE EXCEPTION 'Resolution notes are required to close a product gap';
    END IF;
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_gaps_validate_close_trigger
BEFORE UPDATE ON public.product_gaps
FOR EACH ROW
EXECUTE FUNCTION public.product_gaps_validate_close();