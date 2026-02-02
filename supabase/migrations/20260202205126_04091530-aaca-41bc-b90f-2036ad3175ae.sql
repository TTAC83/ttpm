-- Add tech_lead and tech_sponsor columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS tech_lead uuid REFERENCES profiles(user_id),
ADD COLUMN IF NOT EXISTS tech_sponsor uuid REFERENCES profiles(user_id);

-- Add tech_lead and tech_sponsor columns to solutions_projects table
ALTER TABLE public.solutions_projects 
ADD COLUMN IF NOT EXISTS tech_lead uuid REFERENCES profiles(user_id),
ADD COLUMN IF NOT EXISTS tech_sponsor uuid REFERENCES profiles(user_id);

-- Add tech_lead and tech_sponsor columns to bau_customers table
ALTER TABLE public.bau_customers 
ADD COLUMN IF NOT EXISTS tech_lead uuid REFERENCES profiles(user_id),
ADD COLUMN IF NOT EXISTS tech_sponsor uuid REFERENCES profiles(user_id);