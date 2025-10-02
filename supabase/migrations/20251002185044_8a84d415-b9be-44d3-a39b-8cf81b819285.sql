-- Add factory configuration columns to solutions_projects table
ALTER TABLE public.solutions_projects
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS job_scheduling text,
ADD COLUMN IF NOT EXISTS job_scheduling_notes text,
ADD COLUMN IF NOT EXISTS s3_bucket_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teams_integration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teams_id text,
ADD COLUMN IF NOT EXISTS teams_webhook_url text,
ADD COLUMN IF NOT EXISTS tablet_use_cases text DEFAULT 'None',
ADD COLUMN IF NOT EXISTS modules_and_features text;

-- Add factory configuration columns to bau_customers table
ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS job_scheduling text,
ADD COLUMN IF NOT EXISTS job_scheduling_notes text,
ADD COLUMN IF NOT EXISTS s3_bucket_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teams_integration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teams_id text,
ADD COLUMN IF NOT EXISTS teams_webhook_url text,
ADD COLUMN IF NOT EXISTS tablet_use_cases text DEFAULT 'None',
ADD COLUMN IF NOT EXISTS modules_and_features text;