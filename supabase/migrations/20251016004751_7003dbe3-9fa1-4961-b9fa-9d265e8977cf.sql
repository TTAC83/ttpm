-- Add customer_project_lead column to solutions_projects table
ALTER TABLE public.solutions_projects
ADD COLUMN IF NOT EXISTS customer_project_lead uuid REFERENCES auth.users(id);

-- Add project_goals column to solutions_projects table
ALTER TABLE public.solutions_projects
ADD COLUMN IF NOT EXISTS project_goals text;

-- Add similar columns to projects and bau_customers tables if they don't exist
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_goals text;

ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS project_goals text;

ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS customer_project_lead uuid REFERENCES auth.users(id);