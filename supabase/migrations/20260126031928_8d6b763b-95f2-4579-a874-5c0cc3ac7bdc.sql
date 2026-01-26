-- Add phase tracking columns to impl_weekly_reviews
-- These values persist across meetings until changed

ALTER TABLE impl_weekly_reviews 
ADD COLUMN IF NOT EXISTS phase_installation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phase_installation_details text,
ADD COLUMN IF NOT EXISTS phase_onboarding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phase_onboarding_details text,
ADD COLUMN IF NOT EXISTS phase_live boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phase_live_details text;