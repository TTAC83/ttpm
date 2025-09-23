-- Fix expense views to include missing fields for application compatibility
DROP VIEW IF EXISTS public.v_my_assigned_expenses;
DROP VIEW IF EXISTS public.v_impl_lead_queue;
DROP VIEW IF EXISTS public.v_expense_admin_queue;
DROP VIEW IF EXISTS public.v_approved_expenses;

-- Recreate v_my_assigned_expenses with missing fields
CREATE VIEW public.v_my_assigned_expenses AS 
SELECT ea.id,
    ea.expense_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    e.expense_date,
    e.description AS expense_description,  -- Add missing field
    e.customer AS import_customer,         -- Add missing field
    e.source,                              -- Add missing field
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id;

-- Recreate v_impl_lead_queue with missing fields  
CREATE VIEW public.v_impl_lead_queue AS 
SELECT ea.id,
    ea.expense_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    e.expense_date,
    e.description AS expense_description,
    e.customer AS import_customer,
    e.source,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code,
    p.name AS assignee_name
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN profiles p ON p.user_id = ea.assigned_to_user_id
WHERE ea.status = 'PendingLeadReview';

-- Recreate v_expense_admin_queue with missing fields
CREATE VIEW public.v_expense_admin_queue AS 
SELECT ea.id,
    ea.expense_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.status,
    ea.assigned_to_project_id,
    ea.assigned_to_user_id,
    e.expense_date,
    e.description AS expense_description,
    e.customer AS import_customer,
    e.source,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code,
    p.name AS assignee_name
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN profiles p ON p.user_id = ea.assigned_to_user_id
WHERE ea.status = 'ReadyForSignoff';

-- Recreate v_approved_expenses with missing fields
CREATE VIEW public.v_approved_expenses AS 
SELECT ea.id,
    ea.expense_id,
    ea.customer,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.assignment_notes,
    ea.assigned_at,
    ea.approved_at,
    ea.status,
    e.expense_date,
    e.description AS expense_description,
    e.customer AS import_customer,
    e.source,
    e.net,
    e.vat,
    e.gross,
    e.vat_rate,
    e.account,
    e.account_code,
    p.name AS assignee_name
FROM expense_assignments ea
JOIN expenses e ON e.id = ea.expense_id
LEFT JOIN profiles p ON p.user_id = ea.assigned_to_user_id
WHERE ea.status = 'Approved';