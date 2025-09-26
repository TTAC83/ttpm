-- Update all existing churn risk values from 'Low' to null
UPDATE impl_weekly_reviews 
SET churn_risk = NULL 
WHERE churn_risk = 'Low';