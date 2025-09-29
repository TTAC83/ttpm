import { supabase } from '@/integrations/supabase/client';

export interface SolutionsProject {
  id: string;
  company_name: string;
  domain: 'Vision' | 'IoT' | 'Hybrid';
  site_name: string;
  site_address?: string;
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_job_title?: string;
  created_at: string;
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
  { value: "customer_project_lead", label: "Customer Project Lead" },
  { value: "implementation_lead", label: "Implementation Lead" },
  { value: "ai_iot_engineer", label: "AI/IoT Engineer" },
  { value: "technical_project_lead", label: "Technical Project Lead" },
  { value: "project_coordinator", label: "Project Coordinator" },
  { value: "sales_lead", label: "Sales Lead" },
  { value: "solution_consultant", label: "Solution Consultant" },
  { value: "account_manager", label: "Account Manager" }
];

export const SUGGESTED_ROLE_MAPPINGS = {
  'Solutions Consultant': 'solution_consultant', // Default mapping
  'Salesperson': 'sales_lead', // Default mapping
};

export const fetchSolutionsProjects = async (): Promise<SolutionsProject[]> => {
  const { data, error } = await supabase
    .from('solutions_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchSolutionsProjectById = async (id: string): Promise<SolutionsProject | null> => {
  const { data, error } = await supabase
    .from('solutions_projects')
    .select('*')
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

export const getConversionMapping = async (solutionsProject: SolutionsProject): Promise<ConversionMapping> => {
  // Check if the mapped users exist in the profiles table
  const userIds = [solutionsProject.salesperson, solutionsProject.solutions_consultant].filter(Boolean);
  
  let existingUsers: any[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);
    existingUsers = data || [];
  }

  return {
    salesperson: existingUsers.find(u => u.user_id === solutionsProject.salesperson)?.user_id,
    solutions_consultant: existingUsers.find(u => u.user_id === solutionsProject.solutions_consultant)?.user_id,
    customer_lead_name: solutionsProject.customer_lead,
    availableRoles: PROJECT_ROLES
  };
};

export const convertSolutionsToImplementationProject = async (
  solutionsProject: SolutionsProject,
  roleMapping: { [key: string]: string },
  contractSignedDate: string
) => {
  // Create or find company
  let company_id;
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .ilike('name', solutionsProject.company_name.trim())
    .single();

  if (existingCompany) {
    company_id = existingCompany.id;
  } else {
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({ name: solutionsProject.company_name.trim(), is_internal: false })
      .select('id')
      .single();
    
    if (companyError) throw companyError;
    company_id = newCompany.id;
  }

  // Create the implementation project
  const projectData = {
    company_id,
    name: solutionsProject.site_name, // Use site_name as project name
    site_name: solutionsProject.site_name,
    site_address: solutionsProject.site_address || null,
    domain: solutionsProject.domain,
    contract_signed_date: contractSignedDate,
    customer_project_lead: roleMapping.customer_project_lead || null,
    implementation_lead: roleMapping.implementation_lead || null,
    ai_iot_engineer: roleMapping.ai_iot_engineer || null,
    technical_project_lead: roleMapping.technical_project_lead || null,
    project_coordinator: roleMapping.project_coordinator || null,
    sales_lead: roleMapping.sales_lead || null,
    solution_consultant: roleMapping.solution_consultant || null,
    account_manager: roleMapping.account_manager || null,
  };

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (projectError) throw projectError;

  // Convert solutions_lines to lines
  const solutionsLines = await fetchSolutionsLines(solutionsProject.id);
  
  if (solutionsLines.length > 0) {
    const convertedLines = solutionsLines.map(solutionLine => ({
      project_id: project.id,
      line_name: solutionLine.line_name,
      line_description: solutionLine.line_description,
      product_description: solutionLine.product_description,
      min_speed: solutionLine.min_speed,
      max_speed: solutionLine.max_speed,
    }));

    const { error: linesError } = await supabase
      .from('lines')
      .insert(convertedLines);

    if (linesError) throw linesError;
  }

  return project;
};