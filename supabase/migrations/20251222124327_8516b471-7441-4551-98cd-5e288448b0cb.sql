-- ============================================
-- BACKUP MIGRATION: Preserve impl_weekly data before moving to dynamic week generation
-- ============================================

-- 1. Create backup of impl_weekly_weeks table
CREATE TABLE IF NOT EXISTS public.impl_weekly_weeks_backup AS 
SELECT * FROM public.impl_weekly_weeks;

-- 2. Create backup of impl_weekly_reviews table
CREATE TABLE IF NOT EXISTS public.impl_weekly_reviews_backup AS 
SELECT * FROM public.impl_weekly_reviews;

-- 3. Add comments documenting the backup purpose
COMMENT ON TABLE public.impl_weekly_weeks_backup IS 'Backup of impl_weekly_weeks created 2024-12-22 before transitioning to dynamic week generation. Can be used for rollback if needed.';
COMMENT ON TABLE public.impl_weekly_reviews_backup IS 'Backup of impl_weekly_reviews created 2024-12-22 before transitioning to dynamic week generation. Can be used for rollback if needed.';

-- 4. Note: We're NOT dropping the original tables - just backing them up
-- The impl_weekly_reviews table will continue to be used for storing review data
-- Only the impl_weekly_weeks table usage will be replaced by frontend dynamic generation