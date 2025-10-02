-- Update impl_set_weekly_review function to include churn_risk parameter
CREATE OR REPLACE FUNCTION public.impl_set_weekly_review(
  p_company_id uuid,
  p_week_start date,
  p_project_status impl_week_status,
  p_customer_health impl_health_simple,
  p_churn_risk churn_risk_level DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reason_code text DEFAULT NULL,
  p_weekly_summary text DEFAULT NULL,
  p_planned_go_live_date date DEFAULT NULL,
  p_current_status text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO impl_weekly_reviews(
    company_id,
    week_start,
    week_end,
    project_status,
    customer_health,
    churn_risk,
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
    p_churn_risk,
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
      churn_risk = excluded.churn_risk,
      notes = excluded.notes,
      reason_code = excluded.reason_code,
      weekly_summary = excluded.weekly_summary,
      planned_go_live_date = excluded.planned_go_live_date,
      current_status = excluded.current_status,
      reviewed_by = auth.uid(),
      reviewed_at = now();
$function$;