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
  contract_signed_date: string | null;
  contract_start_date: string | null;
  time_to_first_value_weeks: number | null;
  time_to_meaningful_adoption_weeks: number | null;
  row_type: 'implementation' | 'bau';
  churn_risk: string | null;
  bau_status: string | null;
  domain: string | null;
  implementation_lead_name: string | null;
  tech_lead_name: string | null;
  tech_sponsor_name: string | null;
  live_status: Array<'Installation' | 'Onboarding' | 'Live'>;
  project_classification: string | null;
  weekly_summary: string | null;
}

function derivePhaseStatuses(
  phase_installation: boolean | null | undefined,
  phase_onboarding: boolean | null | undefined,
  phase_live: boolean | null | undefined
): Array<'Installation' | 'Onboarding' | 'Live'> {
  const out: Array<'Installation' | 'Onboarding' | 'Live'> = [];
  if (phase_installation) out.push('Installation');
  if (phase_onboarding) out.push('Onboarding');
  if (phase_live) out.push('Live');
  return out;
}

const EXCLUDED_COMPANY_NAMES = new Set([
  'whs birmingham',
  'stonegate',
  'southern champion',
  'rge peterborough',
  'rge baltic',
  'mccolgans',
  'internal meetings for calendar',
  'cranswick watton',
  'bpi ardeer',
  'bpia ardeer',
]);

function isExcluded(companyName: string | null | undefined, projectName?: string | null): boolean {
  const c = (companyName || '').trim().toLowerCase();
  const p = (projectName || '').trim().toLowerCase();
  if (EXCLUDED_COMPANY_NAMES.has(c)) return true;
  if (EXCLUDED_COMPANY_NAMES.has(p)) return true;
  return false;
}

export async function fetchExecutiveSummaryData(): Promise<ExecutiveSummaryRow[]> {
  // Calculate current week's Monday
  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const mondayISO = format(currentMonday, 'yyyy-MM-dd');
  
  console.log('🔍 Fetching executive summary for week:', mondayISO);

  // Fetch all implementation projects with company info and go-live data from projects table
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, company_id, domain, planned_go_live_date, contract_signed_date, contract_start_date, time_to_first_value_weeks, time_to_meaningful_adoption_weeks, project_classification, implementation_lead, tech_lead, tech_sponsor, companies(name)')
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

  // Fetch the most recent review for each company (for fallback/inheritance)
  // Include ALL reviews (including future weeks) to capture the latest entered data
  const { data: allRecentReviews, error: recentError } = await supabase
    .from('impl_weekly_reviews')
    .select('company_id, customer_health, project_status, reason_code, phase_installation, phase_onboarding, phase_live, week_start, weekly_summary, reviewed_at')
    .order('week_start', { ascending: false });

  if (recentError) throw recentError;

  // For each company, track the most recent review with health/status
  // and (separately) the most recent review with any phase set.
  const mostRecentReviewMap = new Map<string, {
    health: string | null;
    status: string | null;
    reason_code: string | null;
    phase_installation: boolean | null;
    phase_onboarding: boolean | null;
    phase_live: boolean | null;
  }>();
  const mostRecentPhasesMap = new Map<string, {
    phase_installation: boolean | null;
    phase_onboarding: boolean | null;
    phase_live: boolean | null;
  }>();

  (allRecentReviews || []).forEach(r => {
    const hasData = r.customer_health !== null || r.project_status !== null;
    const hasPhases = r.phase_installation || r.phase_onboarding || r.phase_live;

    if (!mostRecentReviewMap.has(r.company_id)) {
      mostRecentReviewMap.set(r.company_id, {
        health: r.customer_health,
        status: r.project_status,
        reason_code: r.reason_code,
        phase_installation: r.phase_installation,
        phase_onboarding: r.phase_onboarding,
        phase_live: r.phase_live
      });
    } else {
      const existing = mostRecentReviewMap.get(r.company_id)!;
      if (hasData && !existing.health && !existing.status) {
        mostRecentReviewMap.set(r.company_id, {
          health: r.customer_health,
          status: r.project_status,
          reason_code: r.reason_code,
          phase_installation: r.phase_installation,
          phase_onboarding: r.phase_onboarding,
          phase_live: r.phase_live
        });
      }
    }

    // Track most recent review (by week_start desc, already sorted) that has phases set
    if (hasPhases && !mostRecentPhasesMap.has(r.company_id)) {
      mostRecentPhasesMap.set(r.company_id, {
        phase_installation: r.phase_installation,
        phase_onboarding: r.phase_onboarding,
        phase_live: r.phase_live
      });
    }
  });

  // Most recent non-empty weekly_summary per company by reviewed_at desc
  const weeklySummaryMap = new Map<string, string>();
  [...(allRecentReviews || [])]
    .sort((a: any, b: any) => {
      const ta = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
      const tb = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
      return tb - ta;
    })
    .forEach((r: any) => {
      const summary = (r.weekly_summary || '').trim();
      if (summary && !weeklySummaryMap.has(r.company_id)) {
        weeklySummaryMap.set(r.company_id, summary);
      }
    });

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

  // Create a map of current week reviews (for health, project status, reason code, and phases)
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

  // Fetch BAU customers (need this before building rows so we can collect all user IDs)
  const { data: bauCustomers, error: bauError } = await supabase
    .from('bau_customers')
    .select('id, name, site_name, churn_risk, current_status, customer_project_lead, tech_lead, tech_sponsor, project_classification, companies!inner(name)')
    .eq('customer_type', 'bau')
    .order('name');

  if (bauError) throw bauError;

  // Collect all unique user IDs and batch-fetch names
  const userIds = new Set<string>();
  projects.forEach(p => {
    if ((p as any).implementation_lead) userIds.add((p as any).implementation_lead);
    if ((p as any).tech_lead) userIds.add((p as any).tech_lead);
    if ((p as any).tech_sponsor) userIds.add((p as any).tech_sponsor);
  });
  (bauCustomers || []).forEach(c => {
    if ((c as any).customer_project_lead) userIds.add((c as any).customer_project_lead);
    if ((c as any).tech_lead) userIds.add((c as any).tech_lead);
    if ((c as any).tech_sponsor) userIds.add((c as any).tech_sponsor);
  });

  const profileMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', Array.from(userIds));
    (profiles || []).forEach(p => {
      if (p.user_id) profileMap.set(p.user_id, p.name || '');
    });
  }
  const nameOf = (id: string | null | undefined) => (id ? profileMap.get(id) || null : null);

  // Build the summary rows
  const implRows: ExecutiveSummaryRow[] = projects.map(project => {
    const currentWeekReview = reviewMap.get(project.company_id);
    const mostRecentReview = mostRecentReviewMap.get(project.company_id);
    const currentWeekHasData = currentWeekReview &&
      (currentWeekReview.health !== null || currentWeekReview.status !== null ||
       currentWeekReview.phase_installation || currentWeekReview.phase_onboarding || currentWeekReview.phase_live);
    const review = currentWeekHasData ? currentWeekReview : mostRecentReview;

    // Phases: prefer the most recent review (any week) that has any phase set,
    // so newly entered phases on a future week's review are surfaced.
    const phaseSource = mostRecentPhasesMap.get(project.company_id) ?? review ?? null;

    const gaps = gapsMap.get(project.id);
    const escData = escalationsMap.get(project.id);

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
      customer_health: (review?.health as 'green' | 'red' | null) || null,
      reason_code: review?.reason_code || null,
      project_on_track: (review?.status as 'on_track' | 'off_track' | null) || null,
      phase_installation: phaseSource?.phase_installation ?? null,
      phase_onboarding: phaseSource?.phase_onboarding ?? null,
      phase_live: phaseSource?.phase_live ?? null,
      product_gaps_status,
      escalation_status,
      planned_go_live_date: project.planned_go_live_date || null,
      contract_signed_date: project.contract_signed_date || null,
      contract_start_date: (project as any).contract_start_date || null,
      time_to_first_value_weeks: (project as any).time_to_first_value_weeks ?? null,
      time_to_meaningful_adoption_weeks: (project as any).time_to_meaningful_adoption_weeks ?? null,
      row_type: 'implementation' as const,
      churn_risk: null,
      bau_status: null,
      domain: project.domain || null,
      implementation_lead_name: nameOf((project as any).implementation_lead),
      tech_lead_name: nameOf((project as any).tech_lead),
      tech_sponsor_name: nameOf((project as any).tech_sponsor),
      live_status: derivePhaseStatuses(phaseSource?.phase_installation, phaseSource?.phase_onboarding, phaseSource?.phase_live),
      project_classification: (project as any).project_classification || null,
      weekly_summary: weeklySummaryMap.get(project.company_id) || null,
    };
  });

  // Get most recent BAU weekly reviews per customer
  const { data: bauReviews } = await supabase
    .from('bau_weekly_reviews')
    .select('bau_customer_id, health, churn_risk, status, reason_code, escalation, date_from, reviewed_at')
    .order('date_from', { ascending: false });

  const bauReviewMap = new Map<string, { health: string | null; churn_risk: string | null; status: string | null; reason_code: string | null }>();
  (bauReviews || []).forEach(r => {
    if (!bauReviewMap.has(r.bau_customer_id)) {
      bauReviewMap.set(r.bau_customer_id, {
        health: r.health,
        churn_risk: r.churn_risk,
        status: r.status,
        reason_code: r.reason_code,
      });
    }
  });

  // Most recent non-empty escalation per BAU customer by reviewed_at desc
  const bauWeeklySummaryMap = new Map<string, string>();
  [...(bauReviews || [])]
    .sort((a: any, b: any) => {
      const ta = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
      const tb = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
      return tb - ta;
    })
    .forEach((r: any) => {
      const summary = (r.escalation || '').trim();
      if (summary && !bauWeeklySummaryMap.has(r.bau_customer_id)) {
        bauWeeklySummaryMap.set(r.bau_customer_id, summary);
      }
    });

  const bauRows: ExecutiveSummaryRow[] = (bauCustomers || []).map(c => {
    const r = bauReviewMap.get(c.id);
    return {
      project_id: c.id,
      customer_name: c.companies?.name || c.name,
      project_name: c.site_name || c.name || 'BAU',
      customer_health: (r?.health as 'green' | 'red' | null) || null,
      reason_code: r?.reason_code || null,
      project_on_track: null,
      phase_installation: null,
      phase_onboarding: null,
      phase_live: null,
      product_gaps_status: 'none' as const,
      escalation_status: 'none' as const,
      planned_go_live_date: null,
      contract_signed_date: null,
      row_type: 'bau' as const,
      churn_risk: r?.churn_risk || (c.churn_risk as string | null) || null,
      bau_status: r?.status || c.current_status || null,
      domain: 'IoT',
      implementation_lead_name: nameOf((c as any).customer_project_lead),
      tech_lead_name: nameOf((c as any).tech_lead),
      tech_sponsor_name: nameOf((c as any).tech_sponsor),
      live_status: ['Live'],
      project_classification: (c as any).project_classification || null,
      weekly_summary: bauWeeklySummaryMap.get(c.id) || null,
    };
  });

  return [...implRows, ...bauRows].filter(
    row => !isExcluded(row.customer_name, row.project_name)
  );
}
