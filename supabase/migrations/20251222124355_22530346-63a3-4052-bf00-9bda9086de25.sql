-- Enable RLS on backup tables (internal users only access)
ALTER TABLE public.impl_weekly_weeks_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impl_weekly_reviews_backup ENABLE ROW LEVEL SECURITY;

-- Create policies - only internal users can access backup data
CREATE POLICY "impl_weekly_weeks_backup_internal_only" ON public.impl_weekly_weeks_backup
  FOR ALL USING ((SELECT is_internal()));

CREATE POLICY "impl_weekly_reviews_backup_internal_only" ON public.impl_weekly_reviews_backup
  FOR ALL USING ((SELECT is_internal()));