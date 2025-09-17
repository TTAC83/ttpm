-- Add is_critical flag to implementation_blockers
ALTER TABLE public.implementation_blockers
ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false;

-- Ensure updated_at still maintained by existing trigger function (no change needed)
-- Backfill existing rows implicitly set to false by DEFAULT
