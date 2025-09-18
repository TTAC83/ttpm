-- Add date fields to feature_requests table
ALTER TABLE public.feature_requests 
ADD COLUMN date_raised date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN required_date date,
ADD COLUMN design_start_date date,
ADD COLUMN dev_start_date date,
ADD COLUMN complete_date date;