ALTER TABLE public.solutions_projects ADD COLUMN logo_use boolean DEFAULT false;
ALTER TABLE public.projects ADD COLUMN logo_use boolean DEFAULT false;
ALTER TABLE public.bau_customers ADD COLUMN logo_use boolean DEFAULT false;