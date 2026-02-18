-- Add camera placement fields to the cameras table
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS placement_camera_can_fit boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS placement_fabrication_confirmed boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS placement_fov_suitable boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS placement_position_description text DEFAULT NULL;