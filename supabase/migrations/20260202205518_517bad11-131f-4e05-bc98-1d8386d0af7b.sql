-- Add vp_customer_success column to projects table with default value
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS vp_customer_success uuid REFERENCES profiles(user_id) DEFAULT '4ab48a1f-edac-49cc-8916-16975a325603';

-- Add vp_customer_success column to solutions_projects table with default value
ALTER TABLE public.solutions_projects 
ADD COLUMN IF NOT EXISTS vp_customer_success uuid REFERENCES profiles(user_id) DEFAULT '4ab48a1f-edac-49cc-8916-16975a325603';

-- Add vp_customer_success column to bau_customers table with default value
ALTER TABLE public.bau_customers 
ADD COLUMN IF NOT EXISTS vp_customer_success uuid REFERENCES profiles(user_id) DEFAULT '4ab48a1f-edac-49cc-8916-16975a325603';

-- Update existing rows that have NULL to use the default
UPDATE public.projects SET vp_customer_success = '4ab48a1f-edac-49cc-8916-16975a325603' WHERE vp_customer_success IS NULL;
UPDATE public.solutions_projects SET vp_customer_success = '4ab48a1f-edac-49cc-8916-16975a325603' WHERE vp_customer_success IS NULL;
UPDATE public.bau_customers SET vp_customer_success = '4ab48a1f-edac-49cc-8916-16975a325603' WHERE vp_customer_success IS NULL;