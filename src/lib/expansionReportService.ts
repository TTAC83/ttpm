import { supabase } from "@/integrations/supabase/client";

export interface ExpansionReportItem {
  id: string;
  customerName: string;
  projectName: string;
  projectType: 'Implementation' | 'BAU' | 'Solutions Consulting';
  expansionOpportunity: string;
  goLiveDate?: string | null;
  health?: string | null;
  projectStatus?: "on_track" | "off_track" | null;
  companyId?: string;
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
        health: null,
        projectStatus: null,
        companyId: project.company_id
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
        health: customer.health,
        projectStatus: null,
        companyId: customer.company_id
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
        health: null,
        projectStatus: null,
        companyId: project.company_id
      });
    });
  }

  // Fetch health and project status for Implementation projects from weekly reviews
  const implCompanyIds = results
    .filter(r => r.projectType === 'Implementation' && r.companyId)
    .map(r => r.companyId!);

  if (implCompanyIds.length > 0) {
    // Get the latest week
    const { data: weeks } = await supabase
      .from('impl_weekly_weeks')
      .select('week_start')
      .order('week_start', { ascending: false })
      .limit(2);

    if (weeks && weeks.length >= 2) {
      const currentWeek = weeks[1].week_start;
      
      const { data: reviews } = await supabase
        .from('impl_weekly_reviews')
        .select('company_id, customer_health, project_status')
        .eq('week_start', currentWeek)
        .in('company_id', implCompanyIds);

      if (reviews) {
        const reviewMap = new Map(
          reviews.map((r: any) => [r.company_id, { health: r.customer_health, status: r.project_status }])
        );

        results.forEach(item => {
          if (item.projectType === 'Implementation' && item.companyId) {
            const review = reviewMap.get(item.companyId);
            if (review) {
              item.health = review.health;
              item.projectStatus = review.status;
            }
          }
        });
      }
    }
  }

  return results;
}

