-- Create lights table for hardware master data
CREATE TABLE public.lights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer text NOT NULL,
  model_number text NOT NULL,
  description text,
  price numeric(10,2),
  order_hyperlink text,
  supplier_name text,
  supplier_person text,
  supplier_email text,
  supplier_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lights ENABLE ROW LEVEL SECURITY;

-- Create policies for lights (internal users only)
CREATE POLICY "lights_internal_all" 
ON public.lights 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.is_internal = true))));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_lights_updated_at
BEFORE UPDATE ON public.lights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add light_id reference to cameras table
ALTER TABLE public.cameras 
ADD COLUMN light_required boolean DEFAULT false,
ADD COLUMN light_id uuid REFERENCES public.lights(id);