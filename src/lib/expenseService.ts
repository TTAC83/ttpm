import { supabase } from '@/integrations/supabase/client';

export interface ExpenseAssignment {
  id: string;
  expense_id: string;
  assigned_to_user_id: string;
  assigned_to_project_id?: string;
  assigned_to_solutions_project_id?: string;
  assigned_by: string;
  is_billable: boolean;
  assignment_notes?: string;
  assigned_at: string;
  updated_at: string;
  status: 'Unassigned' | 'Assigned' | 'ConfirmedByAssignee' | 'PendingLeadReview' | 'ReadyForSignoff' | 'Approved';
  category?: 'FoodDrink' | 'Hotel' | 'Tools' | 'Software' | 'Hardware' | 'Postage' | 'Transport' | 'Other';
  customer?: string;
  assignee_description?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface UnassignedExpense {
  id: string;
  expense_date?: string;
  description?: string;
  customer?: string;
  reference?: string;
  invoice_number?: string;
  net?: number;
  gross?: number;
  vat?: number;
}

export interface Customer {
  customer: string;
}

export interface Project {
  kind: 'implementation' | 'solutions';
  project_id?: string;
  solutions_project_id?: string;
  project_name: string;
  site_name?: string;
  customer_name: string;
  implementation_lead?: string;
}

export interface AssigneeSuggestion {
  user_id: string;
  confidence: number;
  matched_text: string;
}

export interface InternalUser {
  user_id: string;
  name?: string;
  email: string;
}

// Unassigned expenses for batch assignment
export async function listUnassignedExpenses(page = 0, pageSize = 20) {
  const offset = page * pageSize;
  
  const { data, error, count } = await supabase
    .from('expenses')
    .select(`
      id,
      expense_date,
      description,
      customer,
      reference,
      invoice_number,
      net,
      gross,
      vat
    `, { count: 'exact' })
    .not('id', 'in', `(SELECT expense_id FROM expense_assignments)`)
    .order('expense_date', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

// Assign expenses to user
export async function assignExpensesToUser(expenseIds: string[], userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const assignments = expenseIds.map(expenseId => ({
    expense_id: expenseId,
    assigned_to_user_id: userId,
    assigned_by: user?.id,
    status: 'Assigned' as const,
    is_billable: false
  }));

  const { error } = await supabase
    .from('expense_assignments')
    .insert(assignments);

  if (error) throw error;
}

// Get assignee suggestions
export async function getAssigneeSuggestions(expenseId: string): Promise<AssigneeSuggestion[]> {
  const { data, error } = await supabase.rpc('suggest_assignee', { 
    expense_id: expenseId 
  });

  if (error) throw error;
  return data || [];
}

// Get internal users for assignment
export async function getInternalUsers(): Promise<InternalUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, name')
    .eq('is_internal', true)
    .order('name');

  if (error) throw error;

  // For now, return without emails since we can't access auth.admin in client
  return data?.map(profile => ({
    user_id: profile.user_id,
    name: profile.name,
    email: profile.name || 'Unknown'
  })) || [];
}

// Get assigned expenses for current user
export async function listAssignedToMe() {
  const { data, error } = await supabase
    .from('expense_assignments')
    .select(`
      *,
      expenses!inner(
        id,
        expense_date,
        description,
        customer,
        reference,
        invoice_number,
        net,
        gross,
        vat
      )
    `)
    .in('status', ['Assigned', 'ConfirmedByAssignee', 'PendingLeadReview', 'ReadyForSignoff'])
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get customers from view
export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('v_distinct_customers')
    .select('customer')
    .order('customer');

  if (error) throw error;
  return data || [];
}

// Get all projects for selection
export async function getAllProjectsForSelection(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('v_all_projects_for_selection')
    .select('*')
    .order('customer_name, project_name');

  if (error) throw error;
  return (data || []).map(item => ({
    kind: item.kind as 'implementation' | 'solutions',
    project_id: item.project_id,
    solutions_project_id: item.solutions_project_id,
    project_name: item.project_name,
    site_name: item.site_name,
    customer_name: item.customer_name,
    implementation_lead: item.implementation_lead
  }));
}

// Confirm expense assignment
export async function confirmMyExpense(
  assignmentId: string,
  customer: string,
  billable: boolean,
  category: 'FoodDrink' | 'Hotel' | 'Tools' | 'Software' | 'Hardware' | 'Postage' | 'Transport' | 'Other',
  assigneeDescription: string,
  assignToProject: boolean,
  projectKind?: string,
  projectId?: string
) {
  const { error } = await supabase.rpc('expense_confirm', {
    p_assignment_id: assignmentId,
    p_customer: customer,
    p_billable: billable,
    p_category: category,
    p_assignee_description: assigneeDescription,
    p_assign_to_project: assignToProject,
    p_project_kind: projectKind,
    p_project_id: projectId
  });

  if (error) throw error;
}

// Get pending lead review expenses
export async function listPendingLeadReview() {
  const { data, error } = await supabase
    .from('expense_assignments')
    .select(`
      *,
      expenses!inner(
        id,
        expense_date,
        description,
        customer,
        reference,
        invoice_number,
        net,
        gross,
        vat
      ),
      projects!inner(
        id,
        name,
        site_name
      ),
      profiles!assigned_to_user_id(
        name
      )
    `)
    .eq('status', 'PendingLeadReview')
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Lead approve expense
export async function leadApproveExpense(assignmentId: string, billable: boolean) {
  const { error } = await supabase.rpc('expense_lead_approve', {
    p_assignment_id: assignmentId,
    p_billable: billable
  });

  if (error) throw error;
}

// Get ready for signoff expenses
export async function listReadyForSignoff() {
  const { data, error } = await supabase
    .from('expense_assignments')
    .select(`
      *,
      expenses!inner(
        id,
        expense_date,
        description,
        customer,
        reference,
        invoice_number,
        net,
        gross,
        vat
      ),
      profiles!assigned_to_user_id(
        name
      )
    `)
    .eq('status', 'ReadyForSignoff')
    .order('approved_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get approved expenses
export async function listApproved() {
  const { data, error } = await supabase
    .from('expense_assignments')
    .select(`
      *,
      expenses!inner(
        id,
        expense_date,
        description,
        customer,
        reference,
        invoice_number,
        net,
        gross,
        vat
      ),
      profiles!assigned_to_user_id(
        name
      )
    `)
    .eq('status', 'Approved')
    .order('approved_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Admin approve expense
export async function adminApproveExpense(assignmentId: string) {
  const { error } = await supabase.rpc('expense_admin_signoff', {
    p_assignment_id: assignmentId,
    p_approved: true
  });

  if (error) throw error;
}