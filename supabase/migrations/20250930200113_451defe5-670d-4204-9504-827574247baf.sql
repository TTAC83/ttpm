-- Add factory-related fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS job_scheduling TEXT,
ADD COLUMN IF NOT EXISTS job_scheduling_notes TEXT,
ADD COLUMN IF NOT EXISTS s3_bucket_required BOOLEAN,
ADD COLUMN IF NOT EXISTS teams_integration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS teams_id TEXT,
ADD COLUMN IF NOT EXISTS teams_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS tablet_use_cases TEXT DEFAULT 'None',
ADD COLUMN IF NOT EXISTS modules_and_features TEXT;