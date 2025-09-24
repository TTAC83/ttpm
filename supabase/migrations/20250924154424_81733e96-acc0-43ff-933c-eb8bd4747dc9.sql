-- Add billing info fields to projects table
ALTER TABLE public.projects 
ADD COLUMN billing_terms TEXT,
ADD COLUMN hardware_fee NUMERIC(12,2),
ADD COLUMN services_fee NUMERIC(12,2),
ADD COLUMN arr NUMERIC(12,2),
ADD COLUMN mrr NUMERIC(12,2),
ADD COLUMN payment_terms_days INTEGER,
ADD COLUMN contracted_days INTEGER,
ADD COLUMN auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN standard_terms BOOLEAN DEFAULT true,
ADD COLUMN deviation_of_terms TEXT;