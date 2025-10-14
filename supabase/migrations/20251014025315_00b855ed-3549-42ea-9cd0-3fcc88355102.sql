-- Add missing columns to iot_devices table
ALTER TABLE public.iot_devices
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS hardware_master_id uuid REFERENCES public.hardware_master(id);