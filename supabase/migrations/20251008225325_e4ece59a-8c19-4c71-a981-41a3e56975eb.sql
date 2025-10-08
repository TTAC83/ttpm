-- Add planned date offset fields to master_steps table
ALTER TABLE public.master_steps
ADD COLUMN IF NOT EXISTS planned_start_offset_days integer,
ADD COLUMN IF NOT EXISTS planned_end_offset_days integer;

COMMENT ON COLUMN public.master_steps.planned_start_offset_days IS 'Auto-calculated: earliest start offset from associated tasks';
COMMENT ON COLUMN public.master_steps.planned_end_offset_days IS 'Auto-calculated: latest end offset from associated tasks';