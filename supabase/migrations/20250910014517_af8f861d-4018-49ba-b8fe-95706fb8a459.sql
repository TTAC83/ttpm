-- Add critical flag to actions table
ALTER TABLE public.actions ADD COLUMN is_critical BOOLEAN NOT NULL DEFAULT false;