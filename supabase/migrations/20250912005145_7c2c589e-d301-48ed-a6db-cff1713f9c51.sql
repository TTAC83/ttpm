-- Create PLC master data table
CREATE TABLE public.plc_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model_number TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  order_hyperlink TEXT,
  supplier_name TEXT,
  supplier_person TEXT,
  supplier_email TEXT,
  supplier_phone TEXT,
  plc_type TEXT,
  input_output_count TEXT,
  communication_protocol TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plc_master ENABLE ROW LEVEL SECURITY;

-- Create policies for PLC master data (internal users only)
CREATE POLICY "plc_master_internal_all" 
ON public.plc_master 
FOR ALL 
USING (EXISTS ( SELECT 1
  FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_plc_master_updated_at
BEFORE UPDATE ON public.plc_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();