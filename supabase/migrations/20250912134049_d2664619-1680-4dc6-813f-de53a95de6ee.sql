-- Add customer fields to solutions_projects table
ALTER TABLE public.solutions_projects 
ADD COLUMN customer_email text,
ADD COLUMN customer_phone text,
ADD COLUMN customer_job_title text;