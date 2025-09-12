-- Create master data tables for factory hardware requirements

-- Servers master data
CREATE TABLE public.servers_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model_number TEXT NOT NULL,
  server_type TEXT,
  cpu_specs TEXT,
  ram_specs TEXT,
  storage_specs TEXT,
  operating_system TEXT,
  description TEXT,
  price NUMERIC,
  supplier_name TEXT,
  supplier_person TEXT,
  supplier_email TEXT,
  supplier_phone TEXT,
  order_hyperlink TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gateways master data
CREATE TABLE public.gateways_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model_number TEXT NOT NULL,
  gateway_type TEXT,
  communication_protocols TEXT,
  connection_types TEXT,
  max_devices INTEGER,
  power_requirements TEXT,
  description TEXT,
  price NUMERIC,
  supplier_name TEXT,
  supplier_person TEXT,
  supplier_email TEXT,
  supplier_phone TEXT,
  order_hyperlink TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Receivers master data
CREATE TABLE public.receivers_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model_number TEXT NOT NULL,
  receiver_type TEXT,
  frequency_range TEXT,
  communication_protocol TEXT,
  range_distance TEXT,
  power_requirements TEXT,
  description TEXT,
  price NUMERIC,
  supplier_name TEXT,
  supplier_person TEXT,
  supplier_email TEXT,
  supplier_phone TEXT,
  order_hyperlink TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TV Display Devices master data
CREATE TABLE public.tv_displays_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model_number TEXT NOT NULL,
  screen_size TEXT,
  resolution TEXT,
  display_type TEXT,
  connectivity_options TEXT,
  mounting_type TEXT,
  power_consumption TEXT,
  description TEXT,
  price NUMERIC,
  supplier_name TEXT,
  supplier_person TEXT,
  supplier_email TEXT,
  supplier_phone TEXT,
  order_hyperlink TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.servers_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateways_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivers_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_displays_master ENABLE ROW LEVEL SECURITY;

-- Create policies for internal users only
CREATE POLICY "servers_master_internal_all" 
ON public.servers_master 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "gateways_master_internal_all" 
ON public.gateways_master 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "receivers_master_internal_all" 
ON public.receivers_master 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "tv_displays_master_internal_all" 
ON public.tv_displays_master 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_servers_master_updated_at
BEFORE UPDATE ON public.servers_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gateways_master_updated_at
BEFORE UPDATE ON public.gateways_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receivers_master_updated_at
BEFORE UPDATE ON public.receivers_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tv_displays_master_updated_at
BEFORE UPDATE ON public.tv_displays_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();