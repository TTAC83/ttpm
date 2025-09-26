-- Add new boolean fields to projects table
ALTER TABLE public.projects 
ADD COLUMN testimonial boolean DEFAULT false,
ADD COLUMN reference_call boolean DEFAULT false,
ADD COLUMN site_visit boolean DEFAULT false,
ADD COLUMN case_study boolean DEFAULT false;