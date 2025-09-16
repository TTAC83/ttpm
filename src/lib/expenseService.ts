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
  status: 'Unassigned' | 'Assigned' | 'ConfirmedByAssignee' | 'PendingLeadReview' | 'ReadyForSignoff' | 'Approved' | 'Rejected';
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
  try {
    console.log('listUnassignedExpenses: Starting with page:', page, 'pageSize:', pageSize);
    const offset = page * pageSize;
    
    // First get assigned expense IDs
    const { data: assignments, error: assignmentError } = await supabase
      .from('expense_assignments')
      .select('expense_id');
      
    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      throw assignmentError;
    }
      
    const assignedIds = assignments?.map(a => a.expense_id) || [];
    console.log('listUnassignedExpenses: Found', assignedIds.length, 'assigned expenses');
    
    let query = supabase
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
      .order('expense_date', { ascending: false })
      .range(offset, offset + pageSize - 1);
      
    // Filter out assigned expenses if there are any
    // Split into chunks if too many IDs to avoid URL length limits
    if (assignedIds.length > 0) {
      if (assignedIds.length > 100) {
        // For large lists, we need to do this differently
        // Get all expenses first, then filter in memory
        const { data: allExpenses, error: allError, count } = await supabase
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
          .order('expense_date', { ascending: false });
          
        if (allError) {
          console.error('Error fetching all expenses:', allError);
          throw allError;
        }
        
        const assignedSet = new Set(assignedIds);
        const unassignedExpenses = (allExpenses || []).filter(expense => !assignedSet.has(expense.id));
        
        console.log('listUnassignedExpenses: Filtered to', unassignedExpenses.length, 'unassigned expenses');
        
        // Apply pagination manually
        const startIndex = offset;
        const endIndex = Math.min(startIndex + pageSize, unassignedExpenses.length);
        const paginatedData = unassignedExpenses.slice(startIndex, endIndex);
        
        return { 
          data: paginatedData, 
          count: unassignedExpenses.length 
        };
      } else {
        query = query.not('id', 'in', `(${assignedIds.join(',')})`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error executing query:', error);
      throw error;
    }
    
    console.log('listUnassignedExpenses: Query returned', data?.length || 0, 'expenses, count:', count);
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('listUnassignedExpenses: Exception:', error);
    throw error;
  }
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

// Get assigned expenses for current user only
export async function listAssignedToMe() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

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
    .eq('assigned_to_user_id', user.id)
    .in('status', ['Assigned', 'ConfirmedByAssignee', 'PendingLeadReview', 'ReadyForSignoff'])
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get customers from both implementation and solutions projects
export async function getCustomers(): Promise<Customer[]> {
  try {
    // Get customers from implementation projects via companies table
    const { data: implProjects, error: implError } = await supabase
      .from('projects')
      .select(`
        companies!inner(name)
      `)
      .not('companies.name', 'is', null);

    if (implError) throw implError;

    // Get customers from solutions projects
    const { data: solProjects, error: solError } = await supabase
      .from('solutions_projects')
      .select('company_name')
      .not('company_name', 'is', null);

    if (solError) throw solError;

    const allCustomers = new Set<string>();
    
    // Add implementation project customer names
    implProjects?.forEach((project: any) => {
      if (project.companies?.name) {
        allCustomers.add(project.companies.name);
      }
    });
    
    // Add solutions project customer names
    solProjects?.forEach((project: any) => {
      if (project.company_name) {
        allCustomers.add(project.company_name);
      }
    });

    // Convert to array and sort, with "No Customer" at the top
    const customerList = Array.from(allCustomers).sort();
    return [
      { customer: 'No Customer' },
      ...customerList.map(customer => ({ customer }))
    ];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [{ customer: 'No Customer' }];
  }
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

// Get my assigned expenses for review
export async function listMyAssignedExpenses() {
  const { data, error } = await supabase
    .from('v_my_assigned_expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Confirm expense by assignee (user review & target selection)
export async function confirmMyExpense(
  assignmentId: string,
  customer: string,
  billable: boolean,
  category: string,
  assigneeDescription: string,
  assignToProject: boolean,
  projectKind: 'implementation' | 'solutions' | null,
  projectId: string | null
) {
  const updates: any = {
    customer,
    is_billable: billable,
    category,
    assignee_description: assigneeDescription,
    status: 'ConfirmedByAssignee'
  };

  // Set project assignment based on kind
  if (assignToProject && projectKind === 'implementation' && projectId) {
    updates.assigned_to_project_id = projectId;
    updates.assigned_to_solutions_project_id = null;
    updates.status = 'PendingLeadReview';
  } else if (assignToProject && projectKind === 'solutions' && projectId) {
    updates.assigned_to_solutions_project_id = projectId;
    updates.assigned_to_project_id = null;
    updates.status = 'ReadyForSignoff'; // Solutions don't have lead review
  } else {
    updates.assigned_to_project_id = null;
    updates.assigned_to_solutions_project_id = null;
    updates.status = 'ReadyForSignoff'; // BAU/Internal go straight to admin
  }

  const { error } = await supabase
    .from('expense_assignments')
    .update(updates)
    .eq('id', assignmentId);

  if (error) throw error;
}

// Get expense categories for dropdown
export function getExpenseCategories() {
  return [
    { value: 'FoodDrink', label: 'Food & Drink' },
    { value: 'Hotel', label: 'Hotel' },
    { value: 'Tools', label: 'Tools' },
    { value: 'Software', label: 'Software' },
    { value: 'Hardware', label: 'Hardware' },
    { value: 'Postage', label: 'Postage' },
    { value: 'Transport', label: 'Transport' },
    { value: 'Other', label: 'Other' }
  ];
}

// List expenses pending project lead review
export async function listPendingLeadReview() {
  const { data, error } = await supabase
    .from('v_impl_lead_queue')
    .select('*')
    .order('expense_date', { ascending: false });

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

// List expenses ready for admin signoff
export async function listReadyForSignoff() {
  const { data, error } = await supabase
    .from('v_expense_admin_queue')
    .select('*')
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// List approved expenses
export async function listApproved() {
  const { data, error } = await supabase
    .from('v_approved_expenses')
    .select('*')
    .order('approved_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Admin approve expense (final signoff)
export async function adminApproveExpense(assignmentId: string) {
  const { error } = await supabase
    .from('expense_assignments')
    .update({
      status: 'Approved',
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  if (error) throw error;
}

// Reject expense with reason
export async function rejectExpense(assignmentId: string, reason: string) {
  const { error } = await supabase
    .from('expense_assignments')
    .update({
      status: 'Rejected' as any,
      assignment_notes: reason
    })
    .eq('id', assignmentId);

  if (error) throw error;
}