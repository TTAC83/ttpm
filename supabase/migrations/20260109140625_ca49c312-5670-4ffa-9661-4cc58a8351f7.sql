-- Add final_scoping_complete field to solutions_projects table
ALTER TABLE public.solutions_projects 
ADD COLUMN final_scoping_complete BOOLEAN NOT NULL DEFAULT false;