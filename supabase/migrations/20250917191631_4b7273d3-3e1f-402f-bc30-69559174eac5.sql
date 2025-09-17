-- Add reason_code column to implementation_blockers table
ALTER TABLE public.implementation_blockers 
ADD COLUMN reason_code TEXT;