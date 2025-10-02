-- Drop the old version of the function to resolve overloading conflict
DROP FUNCTION IF EXISTS public.impl_set_weekly_review(uuid, date, impl_week_status, impl_health_simple, text, text, text);

-- The new version with all parameters already exists from the previous migration
-- This ensures only one version exists and PostgreSQL can resolve the function call