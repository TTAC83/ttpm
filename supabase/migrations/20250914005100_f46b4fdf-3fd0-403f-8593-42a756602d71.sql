-- 1) TYPES
CREATE TYPE expense_category_enum AS ENUM ('FoodDrink', 'Hotel', 'Tools', 'Software', 'Hardware', 'Postage', 'Transport', 'Other');
CREATE TYPE expense_status_enum AS ENUM ('Unassigned', 'Assigned', 'ConfirmedByAssignee', 'PendingLeadReview', 'ReadyForSignoff', 'Approved');

-- 2) TABLE CHANGES
ALTER TABLE expense_assignments 
ADD COLUMN IF NOT EXISTS status expense_status_enum NOT NULL DEFAULT 'Assigned',
ADD COLUMN IF NOT EXISTS category expense_category_enum,
ADD COLUMN IF NOT EXISTS customer text,
ADD COLUMN IF NOT EXISTS assignee_description text,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 3) VIEWS
CREATE OR REPLACE VIEW v_distinct_customers AS
SELECT DISTINCT COALESCE(p.customer_name, p.name, p.site_name) AS customer
FROM (
  SELECT company_id, name, site_name, name AS customer_name
  FROM projects
  WHERE name IS NOT NULL
  UNION ALL
  SELECT company_id, name, site_name, name
  FROM solutions_projects
  WHERE name IS NOT NULL
) p
WHERE p.customer_name IS NOT NULL
ORDER BY customer;

CREATE OR REPLACE VIEW v_all_projects_for_selection AS
SELECT 'implementation'::text AS kind, 
       pr.id AS project_id, 
       NULL::uuid AS solutions_project_id,
       pr.name AS project_name, 
       pr.site_name, 
       c.name AS customer_name, 
       pr.implementation_lead
FROM projects pr
JOIN companies c ON c.id = pr.company_id
UNION ALL
SELECT 'solutions', 
       NULL, 
       sp.id, 
       sp.name, 
       sp.site_name, 
       c.name, 
       NULL
FROM solutions_projects sp
JOIN companies c ON c.id = sp.company_id;

-- 4) INDEXES
CREATE INDEX IF NOT EXISTS idx_exp_assign_expense ON expense_assignments(expense_id);
CREATE INDEX IF NOT EXISTS idx_exp_assign_assignee_status ON expense_assignments(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_exp_assign_project_status ON expense_assignments(assigned_to_project_id, status);
CREATE INDEX IF NOT EXISTS idx_exp_assign_solutions_status ON expense_assignments(assigned_to_solutions_project_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- 5) HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION auth_user_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_internal() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
AS $$
  SELECT COALESCE((SELECT p.is_internal FROM profiles p WHERE p.user_id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION user_company_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
AS $$
  SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_project_impl_lead(p_project_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
AS $$
  SELECT EXISTS(
    SELECT 1 FROM projects pr
    WHERE pr.id = p_project_id AND pr.implementation_lead = auth.uid()
  );
$$;

-- 6) RLS POLICIES
-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "exp_assign_read_assignee" ON expense_assignments;
DROP POLICY IF EXISTS "exp_assign_update_assignee" ON expense_assignments;
DROP POLICY IF EXISTS "exp_assign_update_internal" ON expense_assignments;
DROP POLICY IF EXISTS "exp_assign_insert_internal" ON expense_assignments;

-- READ policy
CREATE POLICY "exp_assign_read_assignee"
ON expense_assignments FOR SELECT
USING (
  assigned_to_user_id = auth_user_id()
  OR is_internal()
  OR (assigned_to_project_id IS NOT NULL AND is_project_impl_lead(assigned_to_project_id))
);

-- UPDATE by assignee
CREATE POLICY "exp_assign_update_assignee"
ON expense_assignments FOR UPDATE
USING (assigned_to_user_id = auth_user_id())
WITH CHECK (assigned_to_user_id = auth_user_id());

-- UPDATE by internal users
CREATE POLICY "exp_assign_update_internal"
ON expense_assignments FOR UPDATE
USING (is_internal())
WITH CHECK (is_internal());

-- INSERT only by internal
CREATE POLICY "exp_assign_insert_internal"
ON expense_assignments FOR INSERT
WITH CHECK (is_internal());

-- 7) RPCs
CREATE OR REPLACE FUNCTION suggest_assignee(expense_id uuid)
RETURNS TABLE(user_id uuid, confidence numeric, matched_text text)
LANGUAGE plpgsql 
STABLE 
AS $$
DECLARE
  d text;
BEGIN
  SELECT e.description INTO d FROM expenses e WHERE e.id = expense_id;
  RETURN QUERY
  SELECT p.user_id, 0.6::numeric AS confidence, p.name
  FROM profiles p
  WHERE d ILIKE '%' || p.name || '%'
    AND p.is_internal = true
  ORDER BY length(p.name) DESC
  LIMIT 3;
END;
$$;

CREATE OR REPLACE FUNCTION expense_confirm(
  p_assignment_id uuid,
  p_customer text,
  p_billable boolean,
  p_category expense_category_enum,
  p_assignee_description text,
  p_assign_to_project boolean,
  p_project_kind text,
  p_project_id uuid
) RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_assigned_to uuid;
  v_impl_lead uuid;
BEGIN
  -- Ensure caller is the assignee
  SELECT assigned_to_user_id INTO v_assigned_to
  FROM expense_assignments WHERE id = p_assignment_id;
  IF v_assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Apply updates
  UPDATE expense_assignments
  SET customer = p_customer,
      is_billable = p_billable,
      category = p_category,
      assignee_description = p_assignee_description,
      assigned_to_project_id = CASE WHEN p_assign_to_project AND p_project_kind = 'implementation' THEN p_project_id ELSE NULL END,
      assigned_to_solutions_project_id = CASE WHEN p_assign_to_project AND p_project_kind = 'solutions' THEN p_project_id ELSE NULL END,
      status = 'ConfirmedByAssignee'
  WHERE id = p_assignment_id;

  -- Route based on project assignment
  IF p_assign_to_project AND p_project_kind = 'implementation' THEN
    SELECT implementation_lead INTO v_impl_lead FROM projects WHERE id = p_project_id;
    IF v_impl_lead IS NOT NULL THEN
      UPDATE expense_assignments
      SET status = 'PendingLeadReview'
      WHERE id = p_assignment_id;
    ELSE
      UPDATE expense_assignments
      SET status = 'ReadyForSignoff'
      WHERE id = p_assignment_id;
    END IF;
  ELSE
    UPDATE expense_assignments
    SET status = 'ReadyForSignoff'
    WHERE id = p_assignment_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION expense_lead_approve(p_assignment_id uuid, p_billable boolean)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_proj uuid;
BEGIN
  SELECT assigned_to_project_id INTO v_proj FROM expense_assignments WHERE id = p_assignment_id;
  IF v_proj IS NULL OR NOT is_project_impl_lead(v_proj) THEN
    RAISE EXCEPTION 'Not project lead for this expense';
  END IF;

  UPDATE expense_assignments
  SET is_billable = p_billable,
      status = 'ReadyForSignoff',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION expense_admin_signoff(p_assignment_id uuid, p_approved boolean)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF p_approved THEN
    UPDATE expense_assignments
    SET status = 'Approved',
        approved_by = auth.uid(),
        approved_at = now()
    WHERE id = p_assignment_id;
  ELSE
    UPDATE expense_assignments
    SET status = 'Assigned'
    WHERE id = p_assignment_id;
  END IF;
END;
$$;