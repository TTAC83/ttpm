-- Add duration_days column to master_tasks
ALTER TABLE public.master_tasks
ADD COLUMN duration_days INTEGER;

-- Populate duration_days from existing offset data
UPDATE public.master_tasks
SET duration_days = planned_end_offset_days - planned_start_offset_days
WHERE planned_start_offset_days IS NOT NULL 
  AND planned_end_offset_days IS NOT NULL;

-- Set default value for any null durations
UPDATE public.master_tasks
SET duration_days = 1
WHERE duration_days IS NULL;

-- Make duration_days NOT NULL with default
ALTER TABLE public.master_tasks
ALTER COLUMN duration_days SET NOT NULL,
ALTER COLUMN duration_days SET DEFAULT 1;

-- Add check constraint to ensure duration > 0
ALTER TABLE public.master_tasks
ADD CONSTRAINT master_tasks_duration_positive CHECK (duration_days > 0);

-- Add helpful comment
COMMENT ON COLUMN public.master_tasks.duration_days IS 'Task duration in working days. Start and end offsets are now auto-calculated based on dependencies and duration.';