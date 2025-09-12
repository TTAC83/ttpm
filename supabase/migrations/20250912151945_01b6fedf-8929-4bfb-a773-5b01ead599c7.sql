-- Create expenses table for uploaded expense data
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code text,
  account text,
  expense_date date,
  source text,
  description text,
  invoice_number text,
  reference text,
  gross numeric,
  vat numeric,
  net numeric,
  vat_rate numeric,
  vat_rate_name text,
  customer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create expense assignments table for tracking assignments
CREATE TABLE public.expense_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL,
  assigned_to_user_id uuid,
  assigned_to_project_id uuid,
  assigned_to_solutions_project_id uuid,
  is_billable boolean NOT NULL DEFAULT true,
  assignment_notes text,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Internal users can view all expenses" 
ON public.expenses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can manage expenses" 
ON public.expenses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

-- RLS policies for expense assignments
CREATE POLICY "Internal users can view all assignments" 
ON public.expense_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

CREATE POLICY "Internal users can manage assignments" 
ON public.expense_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

-- Add triggers for updated_at columns
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_assignments_updated_at
BEFORE UPDATE ON public.expense_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();