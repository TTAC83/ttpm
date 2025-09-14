-- Fix security issues: Add SET search_path to functions
DROP FUNCTION IF EXISTS auth_user_id();
DROP FUNCTION IF EXISTS is_internal();
DROP FUNCTION IF EXISTS user_company_id();
DROP FUNCTION IF EXISTS is_project_impl_lead(uuid);
DROP FUNCTION IF EXISTS suggest_assignee(uuid);
DROP FUNCTION IF EXISTS expense_confirm(uuid, text, boolean, expense_category_enum, text, boolean, text, uuid);
DROP FUNCTION IF EXISTS expense_lead_approve(uuid, boolean);
DROP FUNCTION IF EXISTS expense_admin_signoff(uuid, boolean);

-- Re-create functions with proper security settings
CREATE OR REPLACE FUNCTION auth_user_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_internal() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_internal FROM profiles p WHERE p.user_id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION user_company_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_project_impl_lead(p_project_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM projects pr
    WHERE pr.id = p_project_id AND pr.implementation_lead = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION suggest_assignee(expense_id uuid)
RETURNS TABLE(user_id uuid, confidence numeric, matched_text text)
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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
SET search_path = public
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
SET search_path = public
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