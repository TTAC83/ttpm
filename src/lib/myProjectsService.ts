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

/**
 * Fetches implementation projects where the current user has any team role assigned
 */
export async function fetchMyProjectsData(userId: string): Promise<ExecutiveSummaryRow[]> {
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

  // Get the full executive summary data and filter to my projects
  const allSummaryData = await fetchExecutiveSummaryData();
  
  return allSummaryData.filter(row => myProjectIds.has(row.project_id));
}
