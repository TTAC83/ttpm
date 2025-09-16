-- Add missing enum value for expense status to fix approval/rejection flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'expense_status_enum' AND e.enumlabel = 'Rejected'
  ) THEN
    ALTER TYPE public.expense_status_enum ADD VALUE 'Rejected';
  END IF;
END $$;