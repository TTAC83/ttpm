import { supabase } from '@/integrations/supabase/client';

export interface SolutionsProject {
  id: string;
  company_id: string;
  domain: 'Vision' | 'IoT' | 'Hybrid';
  site_name: string;
  site_address?: string;
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_job_title?: string;
  segment?: string;
  contract_signed_date?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  break_clause_enabled?: boolean;
  break_clause_project_date?: string | null;
  break_clause_key_points_md?: string | null;
  line_description?: string | null;
  product_description?: string | null;
  project_goals?: string | null;
  contracted_lines?: number | null;
  billing_terms?: string | null;
  hardware_fee?: number | null;
  services_fee?: number | null;
  arr?: number | null;
  mrr?: number | null;
  payment_terms_days?: number | null;
  contracted_days?: number | null;
  auto_renewal?: boolean;
  standard_terms?: boolean;
  deviation_of_terms?: string | null;
  useful_links?: any;
  servers_required?: number | null;
  gateways_required?: number | null;
  tv_display_devices_required?: number | null;
  receivers_required?: number | null;
  lines_required?: number | null;
  website_url?: string | null;
  job_scheduling?: string | null;
  job_scheduling_notes?: string | null;
  s3_bucket_required?: boolean | null;
  teams_integration?: boolean | null;
  teams_id?: string | null;
  teams_webhook_url?: string | null;
  tablet_use_cases?: string | null;
  modules_and_features?: string | null;
  created_at: string;
  companies?: {
    name: string;
  };
}

export interface ConversionMapping {
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead_name?: string;
  availableRoles: Array<{
    value: string;
    label: string;
  }>;
}

export const PROJECT_ROLES = [
  { value: 'customer_project_lead', label: 'Customer Project Lead' },
  { value: 'implementation_lead', label: 'Implementation Lead' },
  { value: 'ai_iot_engineer', label: 'AI/IoT Engineer' },
  { value: 'technical_project_lead', label: 'Technical Project Lead' },
  { value: 'project_coordinator', label: 'Project Coordinator' },
  { value: 'sales_lead', label: 'Sales Lead' },
  { value: 'solution_consultant', label: 'Solution Consultant' },
  { value: 'account_manager', label: 'Account Manager' },
];

export const SUGGESTED_ROLE_MAPPINGS = {
  'Solutions Consultant': 'solution_consultant', // Default mapping
  Salesperson: 'sales_lead', // Default mapping
};

export const fetchSolutionsProjects = async (): Promise<SolutionsProject[]> => {
  const { data, error } = await supabase
    .from('solutions_projects')
    .select('*, companies(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchSolutionsProjectById = async (
  id: string,
): Promise<SolutionsProject | null> => {
  const { data, error } = await supabase
    .from('solutions_projects')
    .select('*, companies(name)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const fetchSolutionsLines = async (solutionsProjectId: string) => {
  const { data, error } = await supabase
    .from('solutions_lines')
    .select('*')
    .eq('solutions_project_id', solutionsProjectId)
    .order('created_at');

  if (error) throw error;
  return data || [];
};

export const getConversionMapping = async (
  solutionsProject: SolutionsProject,
): Promise<ConversionMapping> => {
  // Check if the mapped users exist in the profiles table
  const userIds = [
    solutionsProject.salesperson,
    solutionsProject.solutions_consultant,
  ].filter(Boolean) as string[];

  let existingUsers: any[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);
    existingUsers = data || [];
  }

  return {
    salesperson: existingUsers.find(
      (u) => u.user_id === solutionsProject.salesperson,
    )?.user_id,
    solutions_consultant: existingUsers.find(
      (u) => u.user_id === solutionsProject.solutions_consultant,
    )?.user_id,
    customer_lead_name: solutionsProject.customer_lead,
    availableRoles: PROJECT_ROLES,
  };
};

export const convertSolutionsToImplementationProject = async (
  solutionsProject: SolutionsProject,
  roleMapping: { [key: string]: string },
  contractSignedDate: string,
) => {
  // Use the existing company_id from the solutions project
  const company_id = solutionsProject.company_id;

  // Create the implementation project
  const projectData = {
    company_id,
    name: solutionsProject.site_name, // Use site_name as project name
    site_name: solutionsProject.site_name,
    site_address: solutionsProject.site_address || null,
    domain: solutionsProject.domain,
    segment: solutionsProject.segment || null,
    contract_signed_date: contractSignedDate,
    contract_start_date: solutionsProject.contract_start_date || null,
    contract_end_date: solutionsProject.contract_end_date || null,
    break_clause_enabled: solutionsProject.break_clause_enabled ?? false,
    break_clause_project_date: solutionsProject.break_clause_project_date || null,
    break_clause_key_points_md: solutionsProject.break_clause_key_points_md || null,
    customer_project_lead: roleMapping.customer_project_lead || null,
    implementation_lead: roleMapping.implementation_lead || null,
    ai_iot_engineer: roleMapping.ai_iot_engineer || null,
    technical_project_lead: roleMapping.technical_project_lead || null,
    project_coordinator: roleMapping.project_coordinator || null,
    sales_lead: roleMapping.sales_lead || null,
    solution_consultant: roleMapping.solution_consultant || null,
    account_manager: roleMapping.account_manager || null,
    line_description: solutionsProject.line_description || null,
    product_description: solutionsProject.product_description || null,
    project_goals: solutionsProject.project_goals || null,
    contracted_lines: solutionsProject.contracted_lines || null,
    billing_terms: solutionsProject.billing_terms || null,
    hardware_fee: solutionsProject.hardware_fee || null,
    services_fee: solutionsProject.services_fee || null,
    arr: solutionsProject.arr || null,
    mrr: solutionsProject.mrr || null,
    payment_terms_days: solutionsProject.payment_terms_days || null,
    contracted_days: solutionsProject.contracted_days || null,
    auto_renewal: solutionsProject.auto_renewal ?? true,
    standard_terms: solutionsProject.standard_terms ?? true,
    deviation_of_terms: solutionsProject.deviation_of_terms || null,
    useful_links: solutionsProject.useful_links || null,
    servers_required: solutionsProject.servers_required ?? 0,
    gateways_required: solutionsProject.gateways_required ?? 0,
    tv_display_devices_required: solutionsProject.tv_display_devices_required ?? 0,
    receivers_required: solutionsProject.receivers_required ?? 0,
    lines_required: solutionsProject.lines_required ?? 0,
    website_url: solutionsProject.website_url || null,
    job_scheduling: solutionsProject.job_scheduling || null,
    job_scheduling_notes: solutionsProject.job_scheduling_notes || null,
    s3_bucket_required: solutionsProject.s3_bucket_required ?? false,
    teams_integration: solutionsProject.teams_integration ?? false,
    teams_id: solutionsProject.teams_id || null,
    teams_webhook_url: solutionsProject.teams_webhook_url || null,
    tablet_use_cases: solutionsProject.tablet_use_cases || 'None',
    modules_and_features: solutionsProject.modules_and_features || null,
  };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (projectError) throw projectError;

  // Convert solutions_lines to implementation lines and move related positions/equipment
  const solutionsLines = await fetchSolutionsLines(solutionsProject.id);

  if (solutionsLines.length > 0) {
    for (const solutionLine of solutionsLines) {
      // Create corresponding implementation line
      const { data: newLine, error: lineError } = await supabase
        .from('lines')
        .insert({
          project_id: project.id,
          line_name: solutionLine.line_name,
          line_description: solutionLine.line_description,
          product_description: solutionLine.product_description,
          min_speed: solutionLine.min_speed,
          max_speed: solutionLine.max_speed,
        })
        .select()
        .single();

      if (lineError) throw lineError;

      // Move positions from the solutions line to the new implementation line
      const { error: positionsError } = await supabase
        .from('positions')
        .update({
          line_id: newLine.id,
          solutions_line_id: null,
        })
        .eq('solutions_line_id', solutionLine.id);

      if (positionsError) throw positionsError;

      // Move equipment from the solutions line to the new implementation line
      const { error: equipmentError } = await supabase
        .from('equipment')
        .update({
          line_id: newLine.id,
          solutions_line_id: null,
        })
        .eq('solutions_line_id', solutionLine.id);

      if (equipmentError) throw equipmentError;
    }
  }

  // Move project-level IoT hardware requirements from the solutions project
  // to the new implementation project so the Factory Hardware tab matches.
  const { error: iotRequirementsError } = await supabase
    .from('project_iot_requirements')
    .update({
      project_id: project.id,
      solutions_project_id: null,
    })
    .eq('solutions_project_id', solutionsProject.id);

  if (iotRequirementsError) throw iotRequirementsError;

  return project;
};
