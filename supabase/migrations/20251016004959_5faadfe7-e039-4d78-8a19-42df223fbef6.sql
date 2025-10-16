-- Add name column to solutions_projects table
ALTER TABLE public.solutions_projects
ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';