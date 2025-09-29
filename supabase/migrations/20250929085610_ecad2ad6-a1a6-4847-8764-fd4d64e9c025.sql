-- Drop the overloaded function with churn risk parameters
DROP FUNCTION IF EXISTS public.impl_set_weekly_review(p_company_id uuid, p_week_start date, p_project_status impl_week_status, p_customer_health impl_health_simple, p_notes text, p_reason_code text, p_churn_risk churn_risk_level, p_churn_risk_reason text);

-- Keep only the version without churn risk
-- The function without churn risk parameters already exists and will remain