-- Add expansion_opportunity column to bau_customers
ALTER TABLE public.bau_customers 
ADD COLUMN expansion_opportunity TEXT NULL;