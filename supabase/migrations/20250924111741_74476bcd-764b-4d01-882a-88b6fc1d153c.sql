-- Add useful_links column to projects table
ALTER TABLE public.projects ADD COLUMN useful_links JSONB DEFAULT '[]'::jsonb;