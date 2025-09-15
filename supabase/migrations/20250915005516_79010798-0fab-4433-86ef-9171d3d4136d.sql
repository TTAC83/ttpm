-- Clear existing data and regenerate with correct Monday weeks
TRUNCATE impl_weekly_weeks CASCADE;

-- Regenerate weeks with corrected function
SELECT impl_generate_weeks();