-- Create churn risk enum type
CREATE TYPE churn_risk_level AS ENUM ('Certain', 'High', 'Medium', 'Low');

-- Add churn risk fields to impl_weekly_reviews table
ALTER TABLE impl_weekly_reviews 
ADD COLUMN churn_risk churn_risk_level DEFAULT 'Low',
ADD COLUMN churn_risk_reason text;