-- Drop dependent view first
DROP VIEW IF EXISTS v_bau_expenses;

-- 1) Enums (create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status_enum') THEN
    CREATE TYPE expense_status_enum AS ENUM (
      'Assigned',            -- assigned to a user by internal staff
      'ConfirmedByAssignee', -- user set target & billable/category, submitted
      'PendingLeadReview',   -- waiting for project implementation lead
      'ReadyForSignoff',     -- waiting for Admins
      'Approved',            -- signed off by Admins
      'Rejected'             -- rejected with reason
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category_enum') THEN
    CREATE TYPE expense_category_enum AS ENUM (
      'FoodDrink','Hotel','Tools','Software','Hardware','Postage','Transport','Other'
    );
  END IF;
END$$;

-- 2) Profiles: per-user expense approver
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expense_approver_user_id uuid REFERENCES public.profiles(user_id);

-- 3) Expense assignments: status + review audit + normalize category enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'expense_assignments' 
             AND column_name = 'category') THEN
    ALTER TABLE public.expense_assignments
      ALTER COLUMN category TYPE expense_category_enum USING category::text::expense_category_enum;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'expense_assignments' 
             AND column_name = 'status' 
             AND data_type != 'USER-DEFINED') THEN
    ALTER TABLE public.expense_assignments
      ALTER COLUMN status TYPE expense_status_enum USING status::text::expense_status_enum;
  END IF;
END$$;

ALTER TABLE public.expense_assignments
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(user_id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 4) Helper functions
CREATE OR REPLACE FUNCTION public.has_expense_admin_access() 
RETURNS boolean
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    WHERE u.id = auth.uid() 
    AND lower(u.email) IN (
      'allan@thingtrax.com',
      'paul@thingtrax.com', 
      'ishafqat@thingtrax.com',
      'agupta@thingtrax.com',
      'richard@thingtrax.com'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_impl_lead_for(project_id uuid) 
RETURNS boolean
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.implementation_lead = auth.uid()
  );
$$;

-- 5) Update RLS policies
DROP POLICY IF EXISTS "Authorized users can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authorized users can manage assignments" ON public.expense_assignments;
DROP POLICY IF EXISTS "exp_assign_insert_internal" ON public.expense_assignments;
DROP POLICY IF EXISTS "exp_assign_read_assignee" ON public.expense_assignments;
DROP POLICY IF EXISTS "exp_assign_update_assignee" ON public.expense_assignments;
DROP POLICY IF EXISTS "exp_assign_update_internal" ON public.expense_assignments;

CREATE POLICY "expenses_internal_read" ON public.expenses
FOR SELECT USING (has_expense_access());

CREATE POLICY "expense_assignments_read" ON public.expense_assignments
FOR SELECT USING (
  has_expense_access() OR
  assigned_to_user_id = auth.uid() OR
  (assigned_to_project_id IS NOT NULL AND is_impl_lead_for(assigned_to_project_id)) OR
  has_expense_admin_access()
);

CREATE POLICY "expense_assignments_insert" ON public.expense_assignments
FOR INSERT WITH CHECK (has_expense_access());

CREATE POLICY "expense_assignments_update" ON public.expense_assignments
FOR UPDATE USING (
  has_expense_access() OR
  assigned_to_user_id = auth.uid() OR
  (assigned_to_project_id IS NOT NULL AND is_impl_lead_for(assigned_to_project_id)) OR
  has_expense_admin_access()
) WITH CHECK (
  has_expense_access() OR
  assigned_to_user_id = auth.uid() OR
  (assigned_to_project_id IS NOT NULL AND is_impl_lead_for(assigned_to_project_id)) OR
  has_expense_admin_access()
);

-- 6) Convenience views
CREATE OR REPLACE VIEW public.v_my_assigned_expenses AS
SELECT ea.*, e.expense_date, e.description as expense_description, e.customer as import_customer,
       e.net, e.vat, e.gross, e.vat_rate, e.vat_rate_name, e.account, e.account_code, e.source,
       p.name as assignee_name
FROM public.expense_assignments ea
JOIN public.expenses e ON e.id = ea.expense_id
LEFT JOIN public.profiles p ON p.user_id = ea.assigned_to_user_id
WHERE ea.assigned_to_user_id = auth.uid();

CREATE OR REPLACE VIEW public.v_impl_lead_queue AS
SELECT ea.*, e.expense_date, e.description as expense_description, e.customer as import_customer,
       e.net, e.vat, e.gross, pr.name as project_name, p.name as assignee_name
FROM public.expense_assignments ea
JOIN public.expenses e ON e.id = ea.expense_id
LEFT JOIN public.projects pr ON pr.id = ea.assigned_to_project_id
LEFT JOIN public.profiles p ON p.user_id = ea.assigned_to_user_id
WHERE ea.status = 'PendingLeadReview' AND is_impl_lead_for(ea.assigned_to_project_id);

CREATE OR REPLACE VIEW public.v_expense_admin_queue AS
SELECT ea.*, e.expense_date, e.description as expense_description, e.customer as import_customer,
       e.net, e.vat, e.gross, p.name as assignee_name,
       pr.name as project_name
FROM public.expense_assignments ea
JOIN public.expenses e ON e.id = ea.expense_id
LEFT JOIN public.profiles p ON p.user_id = ea.assigned_to_user_id
LEFT JOIN public.projects pr ON pr.id = ea.assigned_to_project_id
WHERE ea.status = 'ReadyForSignoff';

CREATE OR REPLACE VIEW public.v_approved_expenses AS
SELECT ea.*, e.expense_date, e.description as expense_description, e.customer as import_customer,
       e.net, e.vat, e.gross, p.name as assignee_name,
       pr.name as project_name,
       approver.name as approved_by_name
FROM public.expense_assignments ea
JOIN public.expenses e ON e.id = ea.expense_id
LEFT JOIN public.profiles p ON p.user_id = ea.assigned_to_user_id
LEFT JOIN public.projects pr ON pr.id = ea.assigned_to_project_id
LEFT JOIN public.profiles approver ON approver.user_id = ea.approved_by
WHERE ea.status = 'Approved';

-- Recreate the BAU expenses view
CREATE OR REPLACE VIEW public.v_bau_expenses AS
SELECT 
  ea.id,
  ea.expense_id,
  ea.assigned_to_user_id,
  ea.customer,
  ea.is_billable,
  ea.category,
  ea.assignee_description,
  ea.assignment_notes,
  ea.assigned_at,
  ea.status,
  e.expense_date,
  e.description,
  e.net,
  e.vat,
  e.gross,
  e.vat_rate,
  e.account,
  e.account_code,
  bel.bau_customer_id
FROM public.expense_assignments ea
JOIN public.expenses e ON e.id = ea.expense_id
JOIN public.bau_expense_links bel ON bel.expense_assignment_id = ea.id;

-- 7) Trigger for review audit
CREATE OR REPLACE FUNCTION public.expense_review_audit() 
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('PendingLeadReview','ReadyForSignoff','Approved','Rejected')
     AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_expense_review_audit ON public.expense_assignments;
CREATE TRIGGER trg_expense_review_audit BEFORE UPDATE
ON public.expense_assignments FOR EACH ROW EXECUTE PROCEDURE public.expense_review_audit();