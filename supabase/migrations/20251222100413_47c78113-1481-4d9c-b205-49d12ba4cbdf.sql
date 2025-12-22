-- Insert missing weeks for December 2025
INSERT INTO impl_weekly_weeks (week_start, week_end, available_at)
VALUES 
  ('2025-12-15', '2025-12-21', '2025-12-15 00:01:00+00'),
  ('2025-12-22', '2025-12-28', '2025-12-22 00:01:00+00'),
  ('2025-12-29', '2026-01-04', '2025-12-29 00:01:00+00')
ON CONFLICT (week_start) DO NOTHING;