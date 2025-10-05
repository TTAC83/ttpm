-- Add expansion fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS total_sites integer,
ADD COLUMN IF NOT EXISTS estimated_lines integer,
ADD COLUMN IF NOT EXISTS arr_potential_min numeric(10,2),
ADD COLUMN IF NOT EXISTS arr_potential_max numeric(10,2);

-- Add expansion fields to bau_customers table
ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS total_sites integer,
ADD COLUMN IF NOT EXISTS estimated_lines integer,
ADD COLUMN IF NOT EXISTS arr_potential_min numeric(10,2),
ADD COLUMN IF NOT EXISTS arr_potential_max numeric(10,2);