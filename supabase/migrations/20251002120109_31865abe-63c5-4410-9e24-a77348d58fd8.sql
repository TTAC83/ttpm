-- Add planned_go_live_date and current_status columns to impl_weekly_reviews
ALTER TABLE impl_weekly_reviews
ADD COLUMN planned_go_live_date DATE,
ADD COLUMN current_status TEXT;

-- Update the impl_set_weekly_review function to handle the new fields
CREATE OR REPLACE FUNCTION public.impl_set_weekly_review(
  p_company_id uuid,
  p_week_start date,
  p_project_status impl_week_status,
  p_customer_health impl_health_simple,
  p_notes text DEFAULT NULL::text,
  p_reason_code text DEFAULT NULL::text,
  p_weekly_summary text DEFAULT NULL::text,
  p_planned_go_live_date date DEFAULT NULL::date,
  p_current_status text DEFAULT NULL::text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  INSERT INTO impl_weekly_reviews(
    company_id,
    week_start,
    week_end,
    project_status,
    customer_health,
    notes,
    reason_code,
    weekly_summary,
    planned_go_live_date,
    current_status,
    reviewed_by
  )
  SELECT 
    p_company_id,
    w.week_start,
    w.week_end,
    p_project_status,
    p_customer_health,
    p_notes,
    p_reason_code,
    p_weekly_summary,
    p_planned_go_live_date,
    p_current_status,
    auth.uid()
  FROM impl_weekly_weeks w
  WHERE w.week_start = p_week_start
  ON CONFLICT (company_id, week_start) DO UPDATE
  SET project_status = excluded.project_status,
      customer_health = excluded.customer_health,
      notes = excluded.notes,
      reason_code = excluded.reason_code,
      weekly_summary = excluded.weekly_summary,
      planned_go_live_date = excluded.planned_go_live_date,
      current_status = excluded.current_status,
      reviewed_by = auth.uid(),
      reviewed_at = now();
$function$;