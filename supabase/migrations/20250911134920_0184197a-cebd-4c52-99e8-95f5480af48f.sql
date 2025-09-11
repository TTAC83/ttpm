-- Create vision_models table
CREATE TABLE public.vision_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  line_name TEXT NOT NULL,
  position TEXT NOT NULL,
  equipment TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_title TEXT NOT NULL,
  use_case TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  product_run_start DATE,
  product_run_end DATE,
  status TEXT NOT NULL DEFAULT 'Footage Required' CHECK (status IN ('Footage Required', 'Model Training', 'Model Validation', 'Complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vision_models ENABLE ROW LEVEL SECURITY;

-- Create policies for vision_models
-- Internal users can do everything
CREATE POLICY "vision_models_internal_all" 
ON public.vision_models 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

-- External users can view models for their company's projects
CREATE POLICY "vision_models_external_select" 
ON public.vision_models 
FOR SELECT 
USING (project_id IN (
  SELECT pr.id FROM projects pr 
  WHERE pr.company_id = (
    SELECT profiles.company_id FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
));

-- External users can insert/update models for projects they're members of
CREATE POLICY "vision_models_external_insert" 
ON public.vision_models 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = vision_models.project_id AND pm.user_id = auth.uid()
));

CREATE POLICY "vision_models_external_update" 
ON public.vision_models 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = vision_models.project_id AND pm.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vision_models_updated_at
BEFORE UPDATE ON public.vision_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();