-- Make customer_lead a free text field instead of UUID
DO $$
DECLARE
  fk_name text;
BEGIN
  -- Drop any foreign key constraints on solutions_projects.customer_lead
  FOR fk_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.constraint_schema = kcu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'solutions_projects'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'customer_lead'
  LOOP
    EXECUTE format('ALTER TABLE public.solutions_projects DROP CONSTRAINT IF EXISTS %I', fk_name);
  END LOOP;
END $$;

-- Alter the column type from uuid to text safely
ALTER TABLE public.solutions_projects
ALTER COLUMN customer_lead TYPE text USING customer_lead::text;
