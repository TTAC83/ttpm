-- Add hardware requirement columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS servers_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS gateways_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tv_display_devices_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS receivers_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lines_required integer DEFAULT 0;

-- Add hardware requirement columns to bau_customers table
ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS servers_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS gateways_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tv_display_devices_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS receivers_required integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lines_required integer DEFAULT 0;