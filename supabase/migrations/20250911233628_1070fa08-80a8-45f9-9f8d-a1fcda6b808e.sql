-- Create solutions_lines table
CREATE TABLE public.solutions_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solutions_project_id UUID NOT NULL,
  line_name TEXT NOT NULL,
  min_speed NUMERIC,
  max_speed NUMERIC,
  camera_count INTEGER NOT NULL DEFAULT 0,
  iot_device_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solutions_lines ENABLE ROW LEVEL SECURITY;

-- Create policies for solutions_lines
CREATE POLICY "Internal users can view all solutions lines" 
ON public.solutions_lines 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can create solutions lines" 
ON public.solutions_lines 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can update solutions lines" 
ON public.solutions_lines 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can delete solutions lines" 
ON public.solutions_lines 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));