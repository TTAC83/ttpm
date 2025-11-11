-- Add missing columns to cameras table for storing notes
ALTER TABLE public.cameras 
ADD COLUMN IF NOT EXISTS light_notes TEXT,
ADD COLUMN IF NOT EXISTS hmi_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.cameras.light_notes IS 'Optional notes about lighting configuration';
COMMENT ON COLUMN public.cameras.hmi_notes IS 'Optional notes about HMI configuration';