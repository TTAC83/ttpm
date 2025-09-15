import { supabase } from "@/integrations/supabase/client";

export type ImplWeek = { week_start: string; week_end: string; available_at: string };
export type ImplCompany = { company_id: string; company_name: string };

export async function ensureWeeks(): Promise<void> {
  const { error } = await supabase.rpc("impl_generate_weeks");
  if (error) throw error;
}

export async function listWeeks(): Promise<ImplWeek[]> {
  const { data, error } = await supabase
    .from("impl_weekly_weeks")
    .select("week_start,week_end,available_at")
    .gte("week_start", "2024-08-05")  // Only include proper Monday weeks
    .order("week_start", { ascending: false });
  if (error) throw error;
  // Filter to ensure we only get weeks that start on Monday (dow = 1)
  const mondayWeeks = (data ?? []).filter(week => {
    const weekStart = new Date(week.week_start + "T00:00:00");
    return weekStart.getDay() === 1; // Monday
  });
  return mondayWeeks;
}

export async function listImplCompanies(): Promise<ImplCompany[]> {
  const { data, error } = await supabase
    .from("v_impl_companies")
    .select("company_id,company_name")
    .order("company_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
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

export async function loadOverdueTasks(companyId: string): Promise<TaskRow[]> {
  const today = new Date().toISOString().split('T')[0]; // Today as YYYY-MM-DD
  
  const { data, error } = await supabase
    .from("project_tasks")
    .select("id,project_id,task_title,step_name,assignee,status,planned_start,planned_end,actual_start,actual_end")
    .in("project_id",
      (await supabase.from("projects").select("id").eq("company_id", companyId).in("domain", ["IoT","Vision","Hybrid"])).data?.map(r => r.id) ?? []
    )
    .or(`and(planned_end.lte.${today},actual_end.is.null),and(planned_start.lte.${today},actual_start.is.null)`);
  
  if (error) throw error;
  return data ?? [];
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
  notes: string | null;
  reason_code: string | null;
};

export async function loadReview(companyId: string, weekStartISO: string): Promise<ImplWeeklyReview | null> {
  const { data, error } = await supabase
    .from("impl_weekly_reviews")
    .select("project_status,customer_health,notes,reason_code")
    .eq("company_id", companyId)
    .eq("week_start", weekStartISO)
    .maybeSingle();
  if (error) {
    // if row not found, return null
    if ((error as any).code === "PGRST116") return null;
    throw error;
  }
  return data ?? null;
}

export async function saveReview(params: {
  companyId: string;
  weekStartISO: string;
  projectStatus: "on_track" | "off_track" | null;
  customerHealth: "green" | "red" | null;
  notes?: string | null;
  reasonCode?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("impl_set_weekly_review", {
    p_company_id: params.companyId,
    p_week_start: params.weekStartISO,
    p_project_status: params.projectStatus,
    p_customer_health: params.customerHealth,
    p_notes: params.notes ?? null,
    p_reason_code: params.reasonCode ?? null,
  });
  if (error) throw error;
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
  
  const total_companies = companyIds.length;
  const reviewsData = reviews || [];
  
  const on_track = reviewsData.filter(r => r.project_status === "on_track").length;
  const off_track = reviewsData.filter(r => r.project_status === "off_track").length;
  const green_health = reviewsData.filter(r => r.customer_health === "green").length;
  const red_health = reviewsData.filter(r => r.customer_health === "red").length;
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