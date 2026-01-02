-- Add index on contact_companies.company_id for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_companies_company_id ON public.contact_companies(company_id);

-- Add index on contact_projects for better lookup
CREATE INDEX IF NOT EXISTS idx_contact_projects_project_id ON public.contact_projects(project_id);

-- Add index on contact_solutions_projects for better lookup
CREATE INDEX IF NOT EXISTS idx_contact_solutions_projects_solutions_project_id ON public.contact_solutions_projects(solutions_project_id);