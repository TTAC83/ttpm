-- Add technology_scope column to master_steps table
ALTER TABLE public.master_steps 
ADD COLUMN technology_scope text NOT NULL DEFAULT 'both'
CHECK (technology_scope IN ('iot', 'vision', 'both'));

-- Set all existing steps to 'both'
UPDATE public.master_steps 
SET technology_scope = 'both';