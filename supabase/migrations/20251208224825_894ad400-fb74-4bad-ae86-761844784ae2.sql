-- Add reschedule tracking columns to vision_models
ALTER TABLE public.vision_models
ADD COLUMN reschedule_count integer NOT NULL DEFAULT 0,
ADD COLUMN last_rescheduled_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.vision_models.reschedule_count IS 'Number of times this model has been rescheduled';
COMMENT ON COLUMN public.vision_models.last_rescheduled_at IS 'Timestamp of the last reschedule';