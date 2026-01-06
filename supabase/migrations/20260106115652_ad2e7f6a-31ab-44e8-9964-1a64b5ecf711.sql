-- Drop the foreign key constraint that references the deprecated impl_weekly_weeks table
ALTER TABLE public.impl_weekly_reviews 
DROP CONSTRAINT IF EXISTS impl_weekly_reviews_week_start_fkey;