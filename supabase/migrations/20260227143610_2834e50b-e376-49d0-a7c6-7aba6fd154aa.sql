ALTER TABLE public.solutions_projects
  ADD COLUMN IF NOT EXISTS capex boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS capex_fee numeric DEFAULT null;