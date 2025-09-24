-- Add contract break clause fields to projects table
ALTER TABLE public.projects 
ADD COLUMN break_clause_enabled boolean DEFAULT false,
ADD COLUMN break_clause_project_date date,
ADD COLUMN break_clause_key_points_md text;

-- Add constraint for break_clause_key_points_md max length
ALTER TABLE public.projects 
ADD CONSTRAINT check_break_clause_key_points_md_length 
CHECK (char_length(break_clause_key_points_md) <= 2000);