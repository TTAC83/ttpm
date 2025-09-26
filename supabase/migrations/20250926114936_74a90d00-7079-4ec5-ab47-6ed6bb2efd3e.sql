-- Update the existing function to support churn risk fields
CREATE OR REPLACE FUNCTION public.impl_set_weekly_review(
  p_company_id uuid, 
  p_week_start date, 
  p_project_status impl_week_status, 
  p_customer_health impl_health_simple, 
  p_notes text DEFAULT NULL::text, 
  p_reason_code text DEFAULT NULL::text,
  p_churn_risk churn_risk_level DEFAULT 'Low',
  p_churn_risk_reason text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  INSERT INTO impl_weekly_reviews(company_id, week_start, week_end, project_status, customer_health, notes, reason_code, churn_risk, churn_risk_reason, reviewed_by)
  SELECT p_company_id, w.week_start, w.week_end, p_project_status, p_customer_health, p_notes, p_reason_code, p_churn_risk, p_churn_risk_reason, auth.uid()
  FROM impl_weekly_weeks w
  WHERE w.week_start = p_week_start
  ON CONFLICT (company_id, week_start) DO UPDATE
  SET project_status = excluded.project_status,
      customer_health = excluded.customer_health,
      notes = excluded.notes,
      reason_code = excluded.reason_code,
      churn_risk = excluded.churn_risk,
      churn_risk_reason = excluded.churn_risk_reason,
      reviewed_by = auth.uid(),
      reviewed_at = now();
$function$