import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format } from "date-fns";

export interface ExecutiveSummaryRow {
  project_id: string;
  customer_name: string;
  project_name: string;
  customer_health: 'green' | 'red' | null;
  project_on_track: 'on_track' | 'off_track' | null;
  product_gaps_status: 'none' | 'non_critical' | 'critical';
  segment: string | null;
  expansion_opportunity: string | null;
}

export async function fetchExecutiveSummaryData(): Promise<ExecutiveSummaryRow[]> {
  // Calculate current week's Monday
  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const mondayISO = format(currentMonday, 'yyyy-MM-dd');
  
  console.log('🔍 Fetching executive summary for week:', mondayISO);

  // Fetch all implementation projects with company info
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, company_id, segment, expansion_opportunity, domain, companies(name)')
    .in('domain', ['IoT', 'Vision', 'Hybrid'])
    .order('name');

  if (projectsError) throw projectsError;
  if (!projects) return [];
  
  console.log('🔍 Found projects:', projects.length);

  // Fetch weekly reviews for current week
  const { data: reviews, error: reviewsError } = await supabase
    .from('impl_weekly_reviews')
    .select('company_id, customer_health, project_status, week_start')
    .eq('week_start', mondayISO);

  if (reviewsError) throw reviewsError;
  
  console.log('🔍 Found reviews for', mondayISO, ':', reviews?.length || 0, reviews);

  // Fetch product gaps grouped by project
  const { data: productGaps, error: gapsError } = await supabase
    .from('product_gaps')
    .select('project_id, is_critical, status')
    .neq('status', 'Closed');

  if (gapsError) throw gapsError;

  // Create a map of company reviews
  const reviewMap = new Map(
    (reviews || []).map(r => [
      r.company_id,
      {
        health: r.customer_health,
        status: r.project_status
      }
    ])
  );

  // Group product gaps by project
  const gapsMap = new Map<string, { hasCritical: boolean; hasAny: boolean }>();
  (productGaps || []).forEach(gap => {
    const existing = gapsMap.get(gap.project_id) || { hasCritical: false, hasAny: false };
    gapsMap.set(gap.project_id, {
      hasCritical: existing.hasCritical || gap.is_critical,
      hasAny: true
    });
  });

  // Build the summary rows
  return projects.map(project => {
    // Get project's company review by company_id
    const review = reviewMap.get(project.company_id);
    const gaps = gapsMap.get(project.id);
    
    if (review) {
      console.log('✅ Found review for project', project.name, 'company_id:', project.company_id, review);
    }

    let product_gaps_status: 'none' | 'non_critical' | 'critical' = 'none';
    if (gaps?.hasAny) {
      product_gaps_status = gaps.hasCritical ? 'critical' : 'non_critical';
    }

    return {
      project_id: project.id,
      customer_name: project.companies?.name || 'N/A',
      project_name: project.name,
      customer_health: review?.health || null,
      project_on_track: review?.status || null,
      product_gaps_status,
      segment: project.segment,
      expansion_opportunity: project.expansion_opportunity
    };
  });
}
