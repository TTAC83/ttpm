-- Add customer_type field to bau_customers table
ALTER TABLE public.bau_customers 
ADD COLUMN customer_type text NOT NULL DEFAULT 'bau' CHECK (customer_type IN ('bau', 'implementation'));

-- Add comment for clarity
COMMENT ON COLUMN public.bau_customers.customer_type IS 'Type of customer: bau or implementation';