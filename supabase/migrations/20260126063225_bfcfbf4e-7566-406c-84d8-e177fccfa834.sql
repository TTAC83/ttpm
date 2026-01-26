-- Fix the RPC function to use the correct enum type name (impl_health_simple instead of impl_week_health)
CREATE OR REPLACE FUNCTION public.impl_set_weekly_review(
  p_company_id uuid,
  p_week_start date,
  p_project_status text,
  p_customer_health text,
  p_churn_risk text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reason_code text DEFAULT NULL,
  p_weekly_summary text DEFAULT NULL,
  p_planned_go_live_date date DEFAULT NULL,
  p_current_status text DEFAULT NULL,
  p_phase_installation boolean DEFAULT NULL,
  p_phase_installation_details text DEFAULT NULL,
  p_phase_onboarding boolean DEFAULT NULL,
  p_phase_onboarding_details text DEFAULT NULL,
  p_phase_live boolean DEFAULT NULL,
  p_phase_live_details text DEFAULT NULL,
  p_hypercare boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_end date;
BEGIN
  -- Calculate week_end as 6 days after week_start (Monday to Sunday)
  v_week_end := p_week_start + INTERVAL '6 days';
  
  INSERT INTO impl_weekly_reviews (
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
    phase_installation,
    phase_installation_details,
    phase_onboarding,
    phase_onboarding_details,
    phase_live,
    phase_live_details,
    hypercare
  )
  VALUES (
    p_company_id,
    p_week_start,
    v_week_end,
    p_project_status::impl_week_status,
    p_customer_health::impl_health_simple,
    p_churn_risk::churn_risk_level,
    p_notes,
    p_reason_code,
    p_weekly_summary,
    p_planned_go_live_date,
    p_current_status,
    p_phase_installation,
    p_phase_installation_details,
    p_phase_onboarding,
    p_phase_onboarding_details,
    p_phase_live,
    p_phase_live_details,
    p_hypercare
  )
  ON CONFLICT (company_id, week_start)
  DO UPDATE SET
    project_status = EXCLUDED.project_status,
    customer_health = EXCLUDED.customer_health,
    churn_risk = EXCLUDED.churn_risk,
    notes = EXCLUDED.notes,
    reason_code = EXCLUDED.reason_code,
    weekly_summary = EXCLUDED.weekly_summary,
    planned_go_live_date = EXCLUDED.planned_go_live_date,
    current_status = EXCLUDED.current_status,
    phase_installation = EXCLUDED.phase_installation,
    phase_installation_details = EXCLUDED.phase_installation_details,
    phase_onboarding = EXCLUDED.phase_onboarding,
    phase_onboarding_details = EXCLUDED.phase_onboarding_details,
    phase_live = EXCLUDED.phase_live,
    phase_live_details = EXCLUDED.phase_live_details,
    hypercare = EXCLUDED.hypercare;
END;
$$;