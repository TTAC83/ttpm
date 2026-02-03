import { supabase } from "@/integrations/supabase/client";
import { ExecutiveSummaryRow, fetchExecutiveSummaryData } from "./executiveSummaryService";

// All team role columns on the projects table
const TEAM_ROLE_COLUMNS = [
  'salesperson',
  'solutions_consultant', 
  'customer_project_lead',
  'implementation_lead',
  'account_manager',
  'sales_lead',
  'ai_iot_engineer',
  'technical_project_lead',
  'project_coordinator',
  'tech_lead',
  'tech_sponsor',
  'vp_customer_success',
  'head_of_support'
] as const;

// User IDs that should see all projects
const ALL_PROJECTS_USER_IDS = [
  '1348ed43-210f-4d01-b977-27c3b7cee1b9' // Omair Anwer
];

/**
 * Fetches implementation projects where the current user has any team role assigned
 * Special users (like Omair) see all projects
 */
export async function fetchMyProjectsData(userId: string): Promise<ExecutiveSummaryRow[]> {
  // Get the full executive summary data
  const allSummaryData = await fetchExecutiveSummaryData();
  
  // Special users see all projects
  if (ALL_PROJECTS_USER_IDS.includes(userId)) {
    return allSummaryData;
  }
  
  // Build OR filter for all role columns
  const orFilters = TEAM_ROLE_COLUMNS.map(col => `${col}.eq.${userId}`).join(',');
  
  // First, get project IDs where user has a role
  const { data: projectsWithRole, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .in('domain', ['IoT', 'Vision', 'Hybrid'])
    .or(orFilters);

  if (projectsError) throw projectsError;
  
  const myProjectIds = new Set((projectsWithRole || []).map(p => p.id));
  
  if (myProjectIds.size === 0) {
    return [];
  }

  return allSummaryData.filter(row => myProjectIds.has(row.project_id));
}
