-- Add churn_risk, planned_go_live_date, and current_status to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS churn_risk text,
ADD COLUMN IF NOT EXISTS planned_go_live_date date,
ADD COLUMN IF NOT EXISTS current_status text;

-- Add churn_risk, planned_go_live_date, and current_status to bau_customers table  
ALTER TABLE bau_customers
ADD COLUMN IF NOT EXISTS churn_risk text,
ADD COLUMN IF NOT EXISTS planned_go_live_date date,
ADD COLUMN IF NOT EXISTS current_status text;

-- Migrate latest values from bau_weekly_reviews to bau_customers
WITH latest_reviews AS (
  SELECT DISTINCT ON (bau_customer_id)
    bau_customer_id,
    churn_risk::text,
    NULL::date as planned_go_live_date,
    status as current_status
  FROM bau_weekly_reviews
  ORDER BY bau_customer_id, reviewed_at DESC
)
UPDATE bau_customers bc
SET 
  churn_risk = lr.churn_risk,
  current_status = lr.current_status
FROM latest_reviews lr
WHERE bc.id = lr.bau_customer_id
  AND lr.churn_risk IS NOT NULL OR lr.current_status IS NOT NULL;

-- Migrate latest values from impl_weekly_reviews to projects
-- impl_weekly_reviews uses company_id, so we need to join through projects
WITH latest_impl_reviews AS (
  SELECT DISTINCT ON (iwr.company_id)
    iwr.company_id,
    iwr.churn_risk::text,
    iwr.planned_go_live_date,
    iwr.current_status,
    iwr.reviewed_at
  FROM impl_weekly_reviews iwr
  ORDER BY iwr.company_id, iwr.reviewed_at DESC
)
UPDATE projects p
SET 
  churn_risk = lir.churn_risk,
  planned_go_live_date = lir.planned_go_live_date,
  current_status = lir.current_status
FROM latest_impl_reviews lir
WHERE p.company_id = lir.company_id
  AND (lir.churn_risk IS NOT NULL OR lir.planned_go_live_date IS NOT NULL OR lir.current_status IS NOT NULL);