-- Add PLC and HMI fields to cameras table
ALTER TABLE public.cameras
ADD COLUMN IF NOT EXISTS plc_attached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plc_master_id UUID REFERENCES public.hardware_master(id),
ADD COLUMN IF NOT EXISTS hmi_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hmi_master_id UUID REFERENCES public.hardware_master(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cameras_plc_master_id ON public.cameras(plc_master_id);
CREATE INDEX IF NOT EXISTS idx_cameras_hmi_master_id ON public.cameras(hmi_master_id);