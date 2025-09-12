-- Remove lens_type column from cameras_master table since lenses will be separate hardware
ALTER TABLE public.cameras_master DROP COLUMN lens_type;