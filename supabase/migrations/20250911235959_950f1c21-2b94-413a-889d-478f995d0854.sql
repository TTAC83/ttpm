-- Add name column to iot_devices table
ALTER TABLE public.iot_devices 
ADD COLUMN name text NOT NULL DEFAULT 'Unnamed Device';