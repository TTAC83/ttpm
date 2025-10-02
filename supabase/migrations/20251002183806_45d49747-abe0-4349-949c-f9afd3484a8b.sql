-- Add missing columns to solutions_projects table to match projects and bau_customers
ALTER TABLE public.solutions_projects
ADD COLUMN IF NOT EXISTS segment TEXT,
ADD COLUMN IF NOT EXISTS expansion_opportunity TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_date DATE,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS break_clause_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS break_clause_project_date DATE,
ADD COLUMN IF NOT EXISTS break_clause_key_points_md TEXT,
ADD COLUMN IF NOT EXISTS implementation_lead UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS ai_iot_engineer UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS technical_project_lead UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS project_coordinator UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sales_lead UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS account_manager UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS line_description TEXT,
ADD COLUMN IF NOT EXISTS product_description TEXT,
ADD COLUMN IF NOT EXISTS contracted_lines INTEGER,
ADD COLUMN IF NOT EXISTS billing_terms TEXT,
ADD COLUMN IF NOT EXISTS hardware_fee NUMERIC,
ADD COLUMN IF NOT EXISTS services_fee NUMERIC,
ADD COLUMN IF NOT EXISTS arr NUMERIC,
ADD COLUMN IF NOT EXISTS mrr NUMERIC,
ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER,
ADD COLUMN IF NOT EXISTS contracted_days INTEGER,
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS standard_terms BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deviation_of_terms TEXT,
ADD COLUMN IF NOT EXISTS testimonial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reference_call BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS site_visit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS case_study BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reference_status TEXT,
ADD COLUMN IF NOT EXISTS useful_links JSONB;

-- Rename customer_lead to customer_project_lead for consistency
ALTER TABLE public.solutions_projects
RENAME COLUMN customer_lead TO customer_project_lead;

-- Add salesperson and solutions_consultant to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS salesperson UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS solutions_consultant UUID REFERENCES auth.users(id);

-- Add salesperson and solutions_consultant to bau_customers table
ALTER TABLE public.bau_customers
ADD COLUMN IF NOT EXISTS salesperson UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS solutions_consultant UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.solutions_projects.segment IS 'Business segment (SMB, Enterprise)';
COMMENT ON COLUMN public.solutions_projects.expansion_opportunity IS 'Expansion opportunity (Yes, No)';
COMMENT ON COLUMN public.solutions_projects.contract_signed_date IS 'Date when contract was signed';
COMMENT ON COLUMN public.solutions_projects.break_clause_enabled IS 'Whether break clause is enabled';
COMMENT ON COLUMN public.solutions_projects.testimonial IS 'Customer willing to provide testimonial';
COMMENT ON COLUMN public.solutions_projects.reference_call IS 'Customer willing to do reference calls';
COMMENT ON COLUMN public.solutions_projects.site_visit IS 'Customer willing to host site visits';
COMMENT ON COLUMN public.solutions_projects.case_study IS 'Customer willing to participate in case study';
COMMENT ON COLUMN public.solutions_projects.useful_links IS 'JSON array of useful links for the project';
