-- Add devops_link field to feature_requests table
ALTER TABLE public.feature_requests 
ADD COLUMN devops_link text;