-- Create vision_use_cases table
CREATE TABLE public.vision_use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  limitations_watchouts TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_use_cases ENABLE ROW LEVEL SECURITY;

-- RLS policies - internal users only
CREATE POLICY "vision_use_cases_internal_all"
ON public.vision_use_cases
FOR ALL
TO authenticated
USING (is_internal())
WITH CHECK (is_internal());

-- Add updated_at trigger
CREATE TRIGGER update_vision_use_cases_updated_at
BEFORE UPDATE ON public.vision_use_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();