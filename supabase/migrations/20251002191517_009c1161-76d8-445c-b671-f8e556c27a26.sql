-- Remove default value from churn_risk column in bau_weekly_reviews
ALTER TABLE public.bau_weekly_reviews 
ALTER COLUMN churn_risk DROP DEFAULT;