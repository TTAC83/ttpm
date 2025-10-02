-- Add segment and expansion_opportunity columns to projects table
ALTER TABLE public.projects
ADD COLUMN segment text,
ADD COLUMN expansion_opportunity text;