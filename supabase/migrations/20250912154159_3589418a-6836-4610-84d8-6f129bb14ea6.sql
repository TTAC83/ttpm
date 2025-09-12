-- Add foreign key constraint between expense_assignments and expenses
ALTER TABLE public.expense_assignments 
ADD CONSTRAINT fk_expense_assignments_expense_id 
FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;