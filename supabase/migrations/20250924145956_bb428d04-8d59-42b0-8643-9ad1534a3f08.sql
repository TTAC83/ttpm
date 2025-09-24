-- Add contract start and end date fields to projects table
ALTER TABLE public.projects 
ADD COLUMN contract_start_date date,
ADD COLUMN contract_end_date date;