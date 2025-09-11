-- Create solutions_projects table
CREATE TABLE public.solutions_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  domain work_domain NOT NULL, -- using existing work_domain enum
  site_name TEXT NOT NULL,
  site_address TEXT,
  salesperson UUID,
  solutions_consultant UUID,
  customer_lead UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.solutions_projects ENABLE ROW LEVEL SECURITY;

-- Create policies for solutions projects
CREATE POLICY "Internal users can view all solutions projects"
ON public.solutions_projects
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can create solutions projects"
ON public.solutions_projects
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can update solutions projects"
ON public.solutions_projects
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can delete solutions projects"
ON public.solutions_projects
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_solutions_projects_updated_at
BEFORE UPDATE ON public.solutions_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();