import { supabase } from "@/integrations/supabase/client";
import { generateAvailableWeeks, GeneratedWeek, getCurrentWeekStart, formatWeekLabel } from "./weekUtils";

export type ImplWeek = { week_start: string; week_end: string; available_at: string };
export type ImplCompany = { company_id: string; company_name: string; planned_go_live_date?: string | null };

// Re-export for convenience
export { formatWeekLabel, getCurrentWeekStart };

/**
 * No longer needed - weeks are generated dynamically
 * @deprecated Use generateAvailableWeeks() instead
 */
export async function ensureWeeks(): Promise<void> {
  // No-op - weeks are now generated dynamically in the frontend
  // Keeping this function for backward compatibility
  return;
}

/**
 * Returns dynamically generated weeks (current + recent 4 weeks by default)
 * No longer depends on impl_weekly_weeks table
 */
export function listWeeks(recentCount: number = 4): ImplWeek[] {
  const weeks = generateAvailableWeeks(recentCount, 0);
  return weeks.map(w => ({
    week_start: w.week_start,
    week_end: w.week_end,
    available_at: w.available_at
  }));
}

/**
 * Gets all historical weeks that have review data, combined with recent weeks
 */
export async function listAllWeeksWithData(): Promise<ImplWeek[]> {
  // Get recent dynamic weeks
  const recentWeeks = generateAvailableWeeks(4, 0);
  const recentWeekStarts = new Set(recentWeeks.map(w => w.week_start));
  
  // Get all weeks that have review data in the database
  const { data: reviewWeeks, error } = await supabase
    .from("impl_weekly_reviews")
    .select("week_start, week_end")
    .order("week_start", { ascending: false });
  
  if (error) {
    console.error("Error fetching historical weeks:", error);
    return recentWeeks;
  }
  
  // Build a map of unique weeks from reviews (dedup by week_start)
  const weekMap = new Map<string, ImplWeek>();
  
  // Add recent weeks first
  recentWeeks.forEach(w => {
    weekMap.set(w.week_start, w);
  });
  
  // Add historical weeks from reviews
  (reviewWeeks || []).forEach((r: any) => {
    if (!weekMap.has(r.week_start)) {
      const monday = new Date(r.week_start + 'T00:00:00');
      // Only include if it's a Monday
      if (monday.getDay() === 1) {
        weekMap.set(r.week_start, {
          week_start: r.week_start,
          week_end: r.week_end,
          available_at: new Date(r.week_start + 'T00:01:00').toISOString()
        });
      }
    }
  });
  
  // Sort by week_start descending
  return Array.from(weekMap.values())
    .sort((a, b) => b.week_start.localeCompare(a.week_start));
}

export async function listImplCompanies(): Promise<ImplCompany[]> {
  // Get companies from view
  const { data: companies, error } = await supabase
    .from("v_impl_companies")
    .select("company_id,company_name")
    .order("company_name", { ascending: true });
  if (error) throw error;
  
  if (!companies?.length) return [];
  
  // Get earliest go-live date for each company from projects
  const { data: goLiveDates, error: goLiveError } = await supabase
    .from("projects")
    .select("company_id, planned_go_live_date")
    .in("domain", ["IoT", "Vision", "Hybrid"])
    .not("planned_go_live_date", "is", null)
    .order("planned_go_live_date", { ascending: true });
  
  if (goLiveError) {
    console.error("Error fetching go-live dates:", goLiveError);
    return companies.map(c => ({ ...c, planned_go_live_date: null }));
  }
  
  // Build a map of company_id -> earliest go-live date
  const goLiveDateMap = new Map<string, string>();
  (goLiveDates || []).forEach((p: { company_id: string; planned_go_live_date: string }) => {
    if (!goLiveDateMap.has(p.company_id)) {
      goLiveDateMap.set(p.company_id, p.planned_go_live_date);
    }
  });
  
  // Merge go-live dates with companies
  return companies.map(c => ({
    ...c,
    planned_go_live_date: goLiveDateMap.get(c.company_id) || null
  }));
}

export type TaskRow = {
  id: string;
  project_id: string;
  task_title: string | null;
  step_name: string | null;
  assignee: string | null;
  status: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
};

export async function loadOverdueTasks(companyId: string): Promise<(TaskRow & { subtasks: any[] })[]> {
  const today = new Date().toISOString().split('T')[0]; // Today as YYYY-MM-DD
  
  const { data, error } = await supabase
    .from("project_tasks")
    .select("id,project_id,task_title,step_name,assignee,status,planned_start,planned_end,actual_start,actual_end")
    .in("project_id",
      (await supabase.from("projects").select("id").eq("company_id", companyId).in("domain", ["IoT","Vision","Hybrid"])).data?.map(r => r.id) ?? []
    )
    .or(`and(planned_end.lte.${today},actual_end.is.null),and(planned_start.lte.${today},actual_start.is.null)`);

  if (error) throw error;
  
  const tasks = data ?? [];
  
  // Fetch subtasks for all overdue tasks
  const taskIds = tasks.map(task => task.id);
  let subtasksData: any[] = [];
  
  if (taskIds.length > 0) {
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .in('task_id', taskIds);
    
    if (subtasksError) throw subtasksError;
    subtasksData = subtasks || [];
  }

  // Attach subtasks to their parent tasks
  const tasksWithSubtasks = tasks.map(task => ({
    ...task,
    subtasks: subtasksData.filter(subtask => subtask.task_id === task.id)
  }));

  return tasksWithSubtasks;
}

export type ActionRow = {
  id: string;
  project_id: string | null;
  title: string | null;
  assignee: string | null;
  status: string | null;
  planned_date: string | null;
  is_critical: boolean | null;
  profiles: { name: string } | null;
};

export async function loadOpenActions(companyId: string): Promise<ActionRow[]> {
  const projIdsRes = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId)
    .in("domain", ["IoT","Vision","Hybrid"]);
  if (projIdsRes.error) throw projIdsRes.error;
  const projIds = (projIdsRes.data ?? []).map(r => r.id);

  const { data, error } = await supabase
    .from("actions")
    .select(`
      id,
      project_id,
      title,
      assignee,
      status,
      planned_date,
      is_critical,
      profiles:assignee(name)
    `)
    .in("project_id", projIds)
    .in("status", ["Open","In Progress"])
    .order("is_critical", { ascending: false })
    .order("planned_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type EventRow = {
  id: string;
  project_id: string | null;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_critical: boolean | null;
  created_by: string | null;
  creator_profile: { name: string } | null;
};

export async function loadEventsAroundWeek(companyId: string, mondayISO: string): Promise<EventRow[]> {
  const projIdsRes = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId)
    .in("domain", ["IoT","Vision","Hybrid"]);
  if (projIdsRes.error) throw projIdsRes.error;
  const projIds = (projIdsRes.data ?? []).map(r => r.id);

  // Get events
  const { data: events, error: eventsError } = await supabase
    .from("project_events")
    .select("id,project_id,title,description,start_date,end_date,is_critical,created_by")
    .in("project_id", projIds)
    .gte("start_date", new Date(new Date(mondayISO).getTime() - 7*24*3600*1000).toISOString().slice(0,10))
    .lte("start_date", new Date(new Date(mondayISO).getTime() + 7*24*3600*1000).toISOString().slice(0,10))
    .order("start_date", { ascending: true });
  if (eventsError) throw eventsError;

  if (!events || events.length === 0) return [];

  // Get creator profiles
  const creatorIds = [...new Set(events.map(e => e.created_by).filter(Boolean))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id,name")
    .in("user_id", creatorIds);
  if (profilesError) throw profilesError;

  // Join the data
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  
  return events.map(event => ({
    ...event,
    creator_profile: event.created_by ? profileMap.get(event.created_by) || null : null
  }));
}

export type ImplWeeklyReview = {
  project_status: "on_track" | "off_track" | null;
  customer_health: "green" | "red" | null;
  churn_risk: "Low" | "Medium" | "High" | "Certain" | null;
  notes: string | null;
  reason_code: string | null;
  weekly_summary: string | null;
  planned_go_live_date: string | null;
  current_status: string | null;
  phase_installation: boolean | null;
  phase_installation_details: string | null;
  phase_onboarding: boolean | null;
  phase_onboarding_details: string | null;
  phase_live: boolean | null;
  phase_live_details: string | null;
  hypercare: boolean | null;
};

export async function loadReview(companyId: string, weekStartISO: string): Promise<ImplWeeklyReview | null> {
  console.log('Loading weekly review for:', { companyId, weekStartISO });
  const { data, error } = await supabase
    .from("impl_weekly_reviews")
    .select("project_status,customer_health,churn_risk,notes,reason_code,weekly_summary,planned_go_live_date,current_status,phase_installation,phase_installation_details,phase_onboarding,phase_onboarding_details,phase_live,phase_live_details,hypercare")
    .eq("company_id", companyId)
    .eq("week_start", weekStartISO)
    .maybeSingle();
  console.log('Load result:', { data, error });
  if (error) {
    // if row not found, return null
    if ((error as any).code === "PGRST116") return null;
    throw error;
  }
  return data ? {
    ...data,
    churn_risk: data.churn_risk as "Low" | "Medium" | "High" | "Certain" | null
  } as ImplWeeklyReview : null;
}

export async function saveReview(params: {
  companyId: string;
  weekStartISO: string;
  projectStatus: "on_track" | "off_track" | null;
  customerHealth: "green" | "red" | null;
  churnRisk?: "Low" | "Medium" | "High" | "Certain" | null;
  notes?: string | null;
  reasonCode?: string | null;
  weeklySummary?: string | null;
  plannedGoLiveDate?: string | null;
  currentStatus?: string | null;
  phaseInstallation?: boolean | null;
  phaseInstallationDetails?: string | null;
  phaseOnboarding?: boolean | null;
  phaseOnboardingDetails?: string | null;
  phaseLive?: boolean | null;
  phaseLiveDetails?: string | null;
  hypercare?: boolean | null;
}): Promise<void> {
  console.log('Saving weekly review:', params);
  const { data, error } = await supabase.rpc("impl_set_weekly_review" as any, {
    p_company_id: params.companyId,
    p_week_start: params.weekStartISO,
    p_project_status: params.projectStatus,
    p_customer_health: params.customerHealth,
    p_churn_risk: params.churnRisk ?? null,
    p_notes: params.notes ?? null,
    p_reason_code: params.reasonCode ?? null,
    p_weekly_summary: params.weeklySummary ?? null,
    p_planned_go_live_date: params.plannedGoLiveDate ?? null,
    p_current_status: params.currentStatus ?? null,
    p_phase_installation: params.phaseInstallation ?? null,
    p_phase_installation_details: params.phaseInstallationDetails ?? null,
    p_phase_onboarding: params.phaseOnboarding ?? null,
    p_phase_onboarding_details: params.phaseOnboardingDetails ?? null,
    p_phase_live: params.phaseLive ?? null,
    p_phase_live_details: params.phaseLiveDetails ?? null,
    p_hypercare: params.hypercare ?? null,
  } as any);
  console.log('Save result:', { data, error });
  if (error) {
    console.error('Failed to save weekly review:', error);
    throw error;
  }
}

export type WeeklyStats = {
  total_companies: number;
  on_track: number;
  off_track: number;
  green_health: number;
  red_health: number;
  no_status: number;
  no_health: number;
};

export async function loadWeeklyStats(weekStartISO: string): Promise<WeeklyStats> {
  // Get all implementation companies
  const companiesRes = await supabase
    .from("v_impl_companies")
    .select("company_id");
  if (companiesRes.error) throw companiesRes.error;
  
  const companyIds = (companiesRes.data || []).map(c => c.company_id);
  
  // Get all reviews for this week
  const { data: reviews, error } = await supabase
    .from("impl_weekly_reviews")
    .select("project_status, customer_health")
    .eq("week_start", weekStartISO)
    .in("company_id", companyIds);
  
  if (error) throw error;
  
  const reviewsData = reviews || [];
  
  // Total companies should be all implementation companies
  const total_companies = companyIds.length;
  
  const on_track = reviewsData.filter(r => r.project_status === "on_track").length;
  const off_track = reviewsData.filter(r => r.project_status === "off_track").length;
  const green_health = reviewsData.filter(r => r.customer_health === "green").length;
  const red_health = reviewsData.filter(r => r.customer_health === "red").length;
  
  // No status/health should be total companies minus those with assigned status/health
  const no_status = total_companies - on_track - off_track;
  const no_health = total_companies - green_health - red_health;
  
  return {
    total_companies,
    on_track,
    off_track,
    green_health,
    red_health,
    no_status,
    no_health
  };
}

export type VisionModelRow = {
  id: string;
  project_id: string;
  line_name: string;
  position: string;
  equipment: string;
  product_sku: string;
  product_title: string;
  use_case: string;
  start_date: string | null;
  end_date: string | null;
  product_run_start: string | null;
  product_run_end: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function loadOpenVisionModels(companyId: string): Promise<VisionModelRow[]> {
  const { data, error } = await supabase
    .from("vision_models")
    .select(`
      id,
      project_id,
      line_name,
      position,
      equipment,
      product_sku,
      product_title,
      use_case,
      start_date,
      end_date,
      product_run_start,
      product_run_end,
      status,
      created_at,
      updated_at,
      projects!inner(
        company_id
      )
    `)
    .eq('projects.company_id', companyId)
    .neq('status', 'Complete')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}