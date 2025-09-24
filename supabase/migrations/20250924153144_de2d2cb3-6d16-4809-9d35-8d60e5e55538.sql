-- Add contracted_lines field to projects table
ALTER TABLE public.projects 
ADD COLUMN contracted_lines integer;