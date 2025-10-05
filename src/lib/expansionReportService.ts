import { supabase } from "@/integrations/supabase/client";

export interface ExpansionReportItem {
  id: string;
  customerName: string;
  projectName: string;
  projectType: 'Implementation' | 'BAU' | 'Solutions Consulting';
  expansionOpportunity: string;
  goLiveDate?: string | null;
  health?: string | null;
}

export async function fetchExpansionReport(): Promise<ExpansionReportItem[]> {
  const results: ExpansionReportItem[] = [];

  // Fetch Implementation projects with expansion opportunity = 'Yes'
  const { data: implementationProjects, error: implError } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      site_name,
      expansion_opportunity,
      contract_signed_date,
      company_id,
      companies (
        name
      )
    `)
    .eq('expansion_opportunity', 'Yes');

  if (implError) {
    console.error('Error fetching implementation projects:', implError);
  } else if (implementationProjects) {
    implementationProjects.forEach((project: any) => {
      results.push({
        id: project.id,
        customerName: project.companies?.name || 'Unknown',
        projectName: project.site_name || project.name,
        projectType: 'Implementation',
        expansionOpportunity: project.expansion_opportunity,
        goLiveDate: project.contract_signed_date,
        health: null
      });
    });
  }

  // Fetch BAU customers with expansion opportunity = 'Yes'
  const { data: bauCustomers, error: bauError } = await supabase
    .from('bau_customers')
    .select(`
      id,
      name,
      site_name,
      expansion_opportunity,
      go_live_date,
      health,
      company_id,
      companies (
        name
      )
    `)
    .eq('expansion_opportunity', 'Yes');

  if (bauError) {
    console.error('Error fetching BAU customers:', bauError);
  } else if (bauCustomers) {
    bauCustomers.forEach((customer: any) => {
      results.push({
        id: customer.id,
        customerName: customer.companies?.name || customer.name,
        projectName: customer.site_name || customer.name,
        projectType: 'BAU',
        expansionOpportunity: customer.expansion_opportunity,
        goLiveDate: customer.go_live_date,
        health: customer.health
      });
    });
  }

  // Fetch Solutions projects with expansion opportunity = 'Yes'
  const { data: solutionsProjects, error: solError } = await supabase
    .from('solutions_projects')
    .select(`
      id,
      name,
      expansion_opportunity,
      contract_signed_date,
      company_id
    `)
    .eq('expansion_opportunity', 'Yes');

  if (solError) {
    console.error('Error fetching solutions projects:', solError);
  } else if (solutionsProjects) {
    // Fetch company names separately for solutions projects
    const companyIds = [...new Set(solutionsProjects.map((p: any) => p.company_id).filter(Boolean))];
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);
    
    const companyMap = new Map(companies?.map((c: any) => [c.id, c.name]) || []);
    
    solutionsProjects.forEach((project: any) => {
      results.push({
        id: project.id,
        customerName: companyMap.get(project.company_id) || 'Unknown',
        projectName: project.name,
        projectType: 'Solutions Consulting',
        expansionOpportunity: project.expansion_opportunity,
        goLiveDate: project.contract_signed_date,
        health: null
      });
    });
  }

  return results;
}
