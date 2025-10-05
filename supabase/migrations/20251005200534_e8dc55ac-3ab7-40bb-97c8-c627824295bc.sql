-- Add short-term expansion fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS short_term_estimated_sites integer,
ADD COLUMN IF NOT EXISTS short_term_estimated_lines integer,
ADD COLUMN IF NOT EXISTS short_term_arr_min numeric(10,2),
ADD COLUMN IF NOT EXISTS short_term_arr_max numeric(10,2);

-- Add short-term expansion fields to bau_customers table
ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS short_term_estimated_sites integer,
ADD COLUMN IF NOT EXISTS short_term_estimated_lines integer,
ADD COLUMN IF NOT EXISTS short_term_arr_min numeric(10,2),
ADD COLUMN IF NOT EXISTS short_term_arr_max numeric(10,2);