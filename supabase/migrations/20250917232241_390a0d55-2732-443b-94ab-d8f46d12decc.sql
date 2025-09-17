-- Create product_gaps table
CREATE TABLE public.product_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  description TEXT,
  ticket_link TEXT,
  assigned_to UUID REFERENCES public.profiles(user_id),
  is_critical BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Live' CHECK (status IN ('Live', 'Closed')),
  estimated_complete_date DATE,
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_product_gaps_project_id ON public.product_gaps(project_id);
CREATE INDEX idx_product_gaps_assigned_to ON public.product_gaps(assigned_to);
CREATE INDEX idx_product_gaps_status ON public.product_gaps(status);
CREATE INDEX idx_product_gaps_created_at ON public.product_gaps(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.product_gaps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for internal users (full access)
CREATE POLICY "product_gaps_internal_all" 
ON public.product_gaps 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.is_internal = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.is_internal = true
  )
);

-- Create RLS policies for external users (only their company's projects)
CREATE POLICY "product_gaps_external_select" 
ON public.product_gaps 
FOR SELECT 
USING (
  project_id IN (
    SELECT pr.id FROM public.projects pr 
    WHERE pr.company_id = (
      SELECT p.company_id FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "product_gaps_external_insert" 
ON public.product_gaps 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT pr.id FROM public.projects pr 
    WHERE pr.company_id = (
      SELECT p.company_id FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "product_gaps_external_update" 
ON public.product_gaps 
FOR UPDATE 
USING (
  project_id IN (
    SELECT pr.id FROM public.projects pr 
    WHERE pr.company_id = (
      SELECT p.company_id FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT pr.id FROM public.projects pr 
    WHERE pr.company_id = (
      SELECT p.company_id FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_product_gaps_updated_at
  BEFORE UPDATE ON public.product_gaps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for validation when closing product gaps (function already exists)
CREATE TRIGGER product_gaps_validate_close_trigger
  BEFORE UPDATE ON public.product_gaps
  FOR EACH ROW
  EXECUTE FUNCTION public.product_gaps_validate_close();