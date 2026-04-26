ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS time_to_first_value_weeks INTEGER,
ADD COLUMN IF NOT EXISTS time_to_meaningful_adoption_weeks INTEGER;