import { supabase } from '@/integrations/supabase/client';

export interface BAUCustomer {
  id: string;
  company_id: string;
  primary_contact?: string;
  name: string;
  site_name?: string;
  go_live_date?: string;
  health: 'Excellent' | 'Good' | 'Watch' | 'AtRisk';
  subscription_plan?: string;
  sla_response_mins?: number;
  sla_resolution_hours?: number;
  devices_deployed?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  customer_type: 'bau' | 'implementation';
  company_name?: string;
  open_tickets?: number;
  total_tickets?: number;
  companies?: { name: string };
}

export interface BAUTicket {
  id: string;
  bau_customer_id: string;
  title: string;
  description?: string;
  status: 'Open' | 'InProgress' | 'WaitingCustomer' | 'Resolved' | 'Closed';
  priority: number;
  raised_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  site_name?: string;
  assigned_to_name?: string;
  raised_by_name?: string;
}

export interface BAUVisit {
  id: string;
  bau_customer_id: string;
  visit_date: string;
  visit_type: 'Onsite' | 'Remote' | 'Review' | 'Training';
  attendee?: string;
  summary?: string;
  next_actions?: string;
  created_at: string;
}

export interface BAUChangeRequest {
  id: string;
  bau_customer_id: string;
  title: string;
  description?: string;
  status: 'Proposed' | 'Approved' | 'Rejected' | 'Scheduled' | 'Completed';
  requested_by?: string;
  owner?: string;
  target_date?: string;
  created_at: string;
}

export interface BAUContact {
  id: string;
  bau_customer_id: string;
  profile_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface BAUSite {
  id: string;
  bau_customer_id: string;
  site_name: string;
  address?: string;
  timezone?: string;
}

export interface BAUExpenseLink {
  id: string;
  expense_assignment_id: string;
  bau_customer_id: string;
  is_billable: boolean;
  created_at: string;
}

// Get BAU customers list
export const getBauCustomers = async (page = 1, pageSize = 20, search?: string, customerType?: 'bau' | 'implementation') => {
  let query = supabase
    .from('bau_customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,site_name.ilike.%${search}%`);
  }

  if (customerType) {
    query = query.eq('customer_type', customerType);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;
  const mapped = (data || []).map((row: any) => ({
    ...row,
    company_name: row.company_name ?? null,
    open_tickets: row.open_tickets ?? 0,
    customer_type: row.customer_type as 'bau' | 'implementation',
  }));
  return { data: mapped, count: count || 0 };
};

// Toggle customer type between BAU and implementation
export const toggleCustomerType = async (customerId: string, newType: 'bau' | 'implementation') => {
  try {
    const { data, error } = await supabase
      .from('bau_customers')
      .update({ customer_type: newType })
      .eq('id', customerId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating customer type:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in toggleCustomerType:', error);
    throw error;
  }
};

// Create BAU customer
export const createBauCustomer = async (customerData: {
  company_id: string;
  name: string;
  site_name?: string;
  subscription_plan?: string;
  sla_response_mins?: number;
  sla_resolution_hours?: number;
}) => {
  const { data, error } = await supabase.rpc('bau_create_customer', {
    p_company_id: customerData.company_id,
    p_name: customerData.name,
    p_site_name: customerData.site_name,
    p_plan: customerData.subscription_plan,
    p_sla_response_mins: customerData.sla_response_mins,
    p_sla_resolution_hours: customerData.sla_resolution_hours,
  });

  if (error) throw error;
  return data;
};

// Get BAU customer by ID
export const getBauCustomer = async (id: string) => {
  const { data, error } = await supabase
    .from('bau_customers')
    .select(`
      *,
      companies!inner(name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Update BAU customer health
export const updateBauHealth = async (bauCustomerId: string, health: BAUCustomer['health']) => {
  const { error } = await supabase.rpc('bau_update_health', {
    p_bau_customer_id: bauCustomerId,
    p_health: health,
  });

  if (error) throw error;
};

// Get tickets for BAU customer
export const getBauTickets = async (bauCustomerId: string, page = 1, pageSize = 20) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('bau_tickets')
    .select('*')
    .eq('bau_customer_id', bauCustomerId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

// Create ticket
export const createBauTicket = async (ticketData: {
  bau_customer_id: string;
  title: string;
  description?: string;
  priority?: number;
}) => {
  const { data, error } = await supabase.rpc('bau_create_ticket', {
    p_bau_customer_id: ticketData.bau_customer_id,
    p_title: ticketData.title,
    p_description: ticketData.description,
    p_priority: ticketData.priority || 3,
  });

  if (error) throw error;
  return data;
};

// Update ticket status
export const updateTicketStatus = async (ticketId: string, status: BAUTicket['status']) => {
  const { error } = await supabase.rpc('bau_update_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
  });

  if (error) throw error;
};

// Get visits for BAU customer
export const getBauVisits = async (bauCustomerId: string) => {
  const { data, error } = await supabase
    .from('bau_visits')
    .select('*')
    .eq('bau_customer_id', bauCustomerId)
    .order('visit_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Create visit
export const createBauVisit = async (visitData: {
  bau_customer_id: string;
  visit_date: string;
  visit_type: BAUVisit['visit_type'];
  attendee?: string;
  summary?: string;
  next_actions?: string;
}) => {
  const { data, error } = await supabase.rpc('bau_log_visit', {
    p_bau_customer_id: visitData.bau_customer_id,
    p_visit_date: visitData.visit_date,
    p_visit_type: visitData.visit_type,
    p_attendee: visitData.attendee,
    p_summary: visitData.summary,
    p_next_actions: visitData.next_actions,
  });

  if (error) throw error;
  return data;
};

// Get change requests for BAU customer
export const getBauChangeRequests = async (bauCustomerId: string) => {
  const { data, error } = await supabase
    .from('bau_change_requests')
    .select('*')
    .eq('bau_customer_id', bauCustomerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get contacts for BAU customer
export const getBauContacts = async (bauCustomerId: string) => {
  const { data, error } = await supabase
    .from('bau_contacts')
    .select('*')
    .eq('bau_customer_id', bauCustomerId)
    .order('name');

  if (error) throw error;
  return data || [];
};

// Get sites for BAU customer
export const getBauSites = async (bauCustomerId: string) => {
  const { data, error } = await supabase
    .from('bau_sites')
    .select('*')
    .eq('bau_customer_id', bauCustomerId)
    .order('site_name');

  if (error) throw error;
  return data || [];
};

// Get my tickets
export const getMyBauTickets = async () => {
  const { data, error } = await supabase
    .from('v_bau_my_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get BAU expenses
export const getBauExpenses = async (bauCustomerId: string) => {
  const { data, error } = await supabase
    .from('bau_expense_links')
    .select(`
      *,
      expense_assignments!inner(
        *,
        expenses!inner(*)
      )
    `)
    .eq('bau_customer_id', bauCustomerId);

  if (error) throw error;
  return data || [];
};

// Link expense to BAU
export const linkExpenseToBau = async (expenseAssignmentId: string, bauCustomerId: string, isBillable = false) => {
  const { error } = await supabase.rpc('link_expense_to_bau', {
    p_expense_assignment_id: expenseAssignmentId,
    p_bau_customer_id: bauCustomerId,
    p_is_billable: isBillable,
  });

  if (error) throw error;
};

// Get BAU audit logs
export const getBauAuditLogs = async (bauCustomerId: string) => {
  const { data, error } = await supabase
    .from('bau_audit_logs')
    .select('*')
    .eq('entity_id', bauCustomerId)
    .order('at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get companies for selection
export const getCompanies = async () => {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data || [];
};

// Get internal users for selection
export const getInternalUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, name')
    .eq('is_internal', true)
    .order('name');

  if (error) throw error;
  return data || [];
};

// Create a new company
export const createCompany = async (name: string): Promise<string> => {
  const { data, error } = await supabase
    .from('companies')
    .insert({ name, is_internal: false })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
};