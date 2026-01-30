import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format } from "date-fns";

export interface ExecutiveSummaryRow {
  project_id: string;
  customer_name: string;
  project_name: string;
  customer_health: 'green' | 'red' | null;
  reason_code: string | null;
  project_on_track: 'on_track' | 'off_track' | null;
  phase_installation: boolean | null;
  phase_onboarding: boolean | null;
  phase_live: boolean | null;
  product_gaps_status: 'none' | 'non_critical' | 'critical';
  escalation_status: 'none' | 'active' | 'critical';
  planned_go_live_date: string | null;
}

export async function fetchExecutiveSummaryData(): Promise<ExecutiveSummaryRow[]> {
  // Calculate current week's Monday
  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const mondayISO = format(currentMonday, 'yyyy-MM-dd');
  
  console.log('🔍 Fetching executive summary for week:', mondayISO);

  // Fetch all implementation projects with company info and go-live data from projects table
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, company_id, planned_go_live_date, companies(name)')
    .in('domain', ['IoT', 'Vision', 'Hybrid'])
    .order('name');

  if (projectsError) throw projectsError;
  if (!projects) return [];
  
  console.log('🔍 Found projects:', projects.length);

  // Fetch weekly reviews for current week (only for customer health and project status)
  const { data: reviews, error: reviewsError } = await supabase
    .from('impl_weekly_reviews')
    .select('company_id, customer_health, project_status, reason_code, phase_installation, phase_onboarding, phase_live, week_start')
    .eq('week_start', mondayISO);

  if (reviewsError) throw reviewsError;
  
  console.log('🔍 Found reviews for', mondayISO, ':', reviews?.length || 0, reviews);

  // Fetch product gaps grouped by project
  const { data: productGaps, error: gapsError } = await supabase
    .from('product_gaps')
    .select('project_id, is_critical, status')
    .neq('status', 'Closed');

  if (gapsError) throw gapsError;

  // Fetch escalations (implementation_blockers) grouped by project
  const { data: escalations, error: escalationsError } = await supabase
    .from('implementation_blockers')
    .select('project_id, is_critical, status')
    .eq('status', 'Live');

  if (escalationsError) throw escalationsError;

  // Create a map of company reviews (for health, project status, reason code, and phases)
  const reviewMap = new Map(
    (reviews || []).map(r => [
      r.company_id,
      {
        health: r.customer_health,
        status: r.project_status,
        reason_code: r.reason_code,
        phase_installation: r.phase_installation,
        phase_onboarding: r.phase_onboarding,
        phase_live: r.phase_live
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

  // Group escalations by project
  const escalationsMap = new Map<string, { hasCritical: boolean; hasAny: boolean }>();
  (escalations || []).forEach(esc => {
    if (!esc.project_id) return;
    const existing = escalationsMap.get(esc.project_id) || { hasCritical: false, hasAny: false };
    escalationsMap.set(esc.project_id, {
      hasCritical: existing.hasCritical || esc.is_critical,
      hasAny: true
    });
  });

  // Build the summary rows
  return projects.map(project => {
    // Get project's company review by company_id (for health and status only)
    const review = reviewMap.get(project.company_id);
    const gaps = gapsMap.get(project.id);
    const escData = escalationsMap.get(project.id);
    
    if (review) {
      console.log('✅ Found review for project', project.name, 'company_id:', project.company_id, review);
    }

    let product_gaps_status: 'none' | 'non_critical' | 'critical' = 'none';
    if (gaps?.hasAny) {
      product_gaps_status = gaps.hasCritical ? 'critical' : 'non_critical';
    }

    let escalation_status: 'none' | 'active' | 'critical' = 'none';
    if (escData?.hasAny) {
      escalation_status = escData.hasCritical ? 'critical' : 'active';
    }

    return {
      project_id: project.id,
      customer_name: project.companies?.name || 'N/A',
      project_name: project.name,
      customer_health: review?.health || null,
      reason_code: review?.reason_code || null,
      project_on_track: review?.status || null,
      phase_installation: review?.phase_installation ?? null,
      phase_onboarding: review?.phase_onboarding ?? null,
      phase_live: review?.phase_live ?? null,
      product_gaps_status,
      escalation_status,
      planned_go_live_date: project.planned_go_live_date || null
    };
  });
}
