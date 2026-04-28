import { supabase } from "@/integrations/supabase/client";

export type EventScope = "implementation" | "solutions" | "standalone";

export interface CalendarEventAttendee {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_critical: boolean;
  created_by: string;
  created_at: string;
  project_id: string | null;
  solutions_project_id: string | null;
  // Enriched
  scope: EventScope;
  project_name: string | null;
  company_id: string | null;
  company_name: string | null;
  attendees: CalendarEventAttendee[];
}

export interface ListEventsFilters {
  companyId?: string | null;        // 'all' or null = no filter
  scope?: EventScope | "all";       // default 'all'
  attendeeUserIds?: string[];       // empty/undefined = no filter
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  is_critical: boolean;
  scope: EventScope;
  project_id?: string | null;
  solutions_project_id?: string | null;
  attendee_user_ids: string[];
  created_by: string;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  is_critical?: boolean;
  scope?: EventScope;
  project_id?: string | null;
  solutions_project_id?: string | null;
  attendee_user_ids?: string[];
}

const scopeOf = (row: { project_id: string | null; solutions_project_id: string | null }): EventScope => {
  if (row.project_id) return "implementation";
  if (row.solutions_project_id) return "solutions";
  return "standalone";
};

export const calendarEventsService = {
  async listEvents(filters: ListEventsFilters = {}): Promise<CalendarEvent[]> {
    const { companyId, scope = "all", attendeeUserIds } = filters;

    // 1. Resolve company filter -> set of project ids and solutions_project ids
    let allowedProjectIds: string[] | null = null;
    let allowedSolutionsIds: string[] | null = null;

    if (companyId && companyId !== "all") {
      const [projRes, solRes] = await Promise.all([
        supabase.from("projects").select("id").eq("company_id", companyId),
        supabase.from("solutions_projects").select("id").eq("company_id", companyId),
      ]);
      if (projRes.error) throw projRes.error;
      if (solRes.error) throw solRes.error;
      allowedProjectIds = (projRes.data ?? []).map((r: any) => r.id);
      allowedSolutionsIds = (solRes.data ?? []).map((r: any) => r.id);
    }

    // 2. Fetch events (RLS filters by company access on project-scoped rows automatically)
    let query = supabase
      .from("project_events")
      .select("id, title, description, start_date, end_date, is_critical, created_by, created_at, project_id, solutions_project_id")
      .order("start_date", { ascending: true });

    const { data: rows, error } = await query;
    if (error) throw error;

    let events = (rows ?? []) as any[];

    // 3. Apply scope filter (client-side; small list)
    if (scope !== "all") {
      events = events.filter((e) => scopeOf(e) === scope);
    }

    // 4. Apply company filter (only if set)
    if (companyId && companyId !== "all") {
      const projSet = new Set(allowedProjectIds ?? []);
      const solSet = new Set(allowedSolutionsIds ?? []);
      events = events.filter((e) => (e.project_id && projSet.has(e.project_id)) || (e.solutions_project_id && solSet.has(e.solutions_project_id)));
    }

    if (events.length === 0) return [];

    // 5. Apply attendee filter
    let attendeesByEvent: Map<string, CalendarEventAttendee[]> = new Map();
    {
      const eventIds = events.map((e) => e.id);
      const { data: attRows, error: attErr } = await supabase
        .from("event_attendees")
        .select("event_id, user_id")
        .in("event_id", eventIds);
      if (attErr) throw attErr;

      const allUserIds = Array.from(new Set((attRows ?? []).map((r: any) => r.user_id)));
      let profileMap = new Map<string, { name: string | null; avatar_url: string | null }>();
      if (allUserIds.length) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", allUserIds);
        (profileRows ?? []).forEach((p: any) => profileMap.set(p.user_id, { name: p.name, avatar_url: p.avatar_url }));
      }

      (attRows ?? []).forEach((r: any) => {
        const list = attendeesByEvent.get(r.event_id) ?? [];
        const prof = profileMap.get(r.user_id);
        list.push({ user_id: r.user_id, name: prof?.name ?? null, avatar_url: prof?.avatar_url ?? null });
        attendeesByEvent.set(r.event_id, list);
      });
    }

    if (attendeeUserIds && attendeeUserIds.length > 0) {
      const filterSet = new Set(attendeeUserIds);
      events = events.filter((e) => {
        const atts = attendeesByEvent.get(e.id) ?? [];
        return atts.some((a) => filterSet.has(a.user_id));
      });
    }

    if (events.length === 0) return [];

    // 6. Enrich with project + company names
    const projIds = Array.from(new Set(events.map((e) => e.project_id).filter(Boolean))) as string[];
    const solIds = Array.from(new Set(events.map((e) => e.solutions_project_id).filter(Boolean))) as string[];

    const projMap = new Map<string, { name: string; company_id: string | null }>();
    const solMap = new Map<string, { name: string; company_id: string | null }>();

    if (projIds.length) {
      const r = await supabase.from("projects").select("id, name, company_id").in("id", projIds);
      (r.data ?? []).forEach((p: any) => projMap.set(p.id, { name: p.name, company_id: p.company_id }));
    }
    if (solIds.length) {
      const r = await supabase.from("solutions_projects").select("id, name, company_id").in("id", solIds);
      (r.data ?? []).forEach((p: any) => solMap.set(p.id, { name: p.name, company_id: p.company_id }));
    }

    const companyIds = Array.from(new Set([
      ...Array.from(projMap.values()).map((v) => v.company_id).filter(Boolean) as string[],
      ...Array.from(solMap.values()).map((v) => v.company_id).filter(Boolean) as string[],
    ]));
    const companyMap = new Map<string, string>();
    if (companyIds.length) {
      const { data: cRows } = await supabase.from("companies").select("id, name").in("id", companyIds);
      (cRows ?? []).forEach((c: any) => companyMap.set(c.id, c.name));
    }

    return events.map((e: any) => {
      const proj = e.project_id ? projMap.get(e.project_id) : null;
      const sol = e.solutions_project_id ? solMap.get(e.solutions_project_id) : null;
      const cid = proj?.company_id ?? sol?.company_id ?? null;
      return {
        ...e,
        scope: scopeOf(e),
        project_name: proj?.name ?? sol?.name ?? null,
        company_id: cid,
        company_name: cid ? companyMap.get(cid) ?? null : null,
        attendees: attendeesByEvent.get(e.id) ?? [],
      } as CalendarEvent;
    });
  },

  async createEvent(payload: CreateEventPayload): Promise<string> {
    const insert: any = {
      title: payload.title,
      description: payload.description ?? null,
      start_date: payload.start_date,
      end_date: payload.end_date,
      is_critical: payload.is_critical,
      created_by: payload.created_by,
      project_id: payload.scope === "implementation" ? payload.project_id ?? null : null,
      solutions_project_id: payload.scope === "solutions" ? payload.solutions_project_id ?? null : null,
      project_type: payload.scope === "solutions" ? "solutions" : "implementation",
    };

    const { data, error } = await supabase
      .from("project_events")
      .insert(insert)
      .select("id")
      .single();
    if (error) throw error;

    if (payload.attendee_user_ids.length > 0) {
      const rows = payload.attendee_user_ids.map((uid) => ({ event_id: data.id, user_id: uid }));
      const { error: aErr } = await supabase.from("event_attendees").insert(rows);
      if (aErr) throw aErr;
    }
    return data.id as string;
  },

  async updateEvent(eventId: string, payload: UpdateEventPayload): Promise<void> {
    const update: any = {};
    if (payload.title !== undefined) update.title = payload.title;
    if (payload.description !== undefined) update.description = payload.description;
    if (payload.start_date !== undefined) update.start_date = payload.start_date;
    if (payload.end_date !== undefined) update.end_date = payload.end_date;
    if (payload.is_critical !== undefined) update.is_critical = payload.is_critical;
    if (payload.scope !== undefined) {
      update.project_id = payload.scope === "implementation" ? payload.project_id ?? null : null;
      update.solutions_project_id = payload.scope === "solutions" ? payload.solutions_project_id ?? null : null;
      update.project_type = payload.scope === "solutions" ? "solutions" : "implementation";
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from("project_events").update(update).eq("id", eventId);
      if (error) throw error;
    }

    if (payload.attendee_user_ids !== undefined) {
      const { error: dErr } = await supabase.from("event_attendees").delete().eq("event_id", eventId);
      if (dErr) throw dErr;
      if (payload.attendee_user_ids.length > 0) {
        const rows = payload.attendee_user_ids.map((uid) => ({ event_id: eventId, user_id: uid }));
        const { error: iErr } = await supabase.from("event_attendees").insert(rows);
        if (iErr) throw iErr;
      }
    }
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from("project_events").delete().eq("id", eventId);
    if (error) throw error;
  },

  // Helpers used by the dialog
  async listSelectableProjects(companyId?: string | null): Promise<{ id: string; name: string; company_id: string | null; company_name: string | null }[]> {
    let q = supabase.from("projects").select("id, name, company_id");
    if (companyId && companyId !== "all") q = q.eq("company_id", companyId);
    const { data, error } = await q.order("name");
    if (error) throw error;
    const cIds = Array.from(new Set((data ?? []).map((p: any) => p.company_id).filter(Boolean))) as string[];
    const cMap = new Map<string, string>();
    if (cIds.length) {
      const { data: cRows } = await supabase.from("companies").select("id, name").in("id", cIds);
      (cRows ?? []).forEach((c: any) => cMap.set(c.id, c.name));
    }
    return (data ?? []).map((p: any) => ({ ...p, company_name: p.company_id ? cMap.get(p.company_id) ?? null : null }));
  },

  async listSelectableSolutionsProjects(companyId?: string | null): Promise<{ id: string; name: string; company_id: string | null; company_name: string | null }[]> {
    let q = supabase.from("solutions_projects").select("id, name, company_id");
    if (companyId && companyId !== "all") q = q.eq("company_id", companyId);
    const { data, error } = await q.order("name");
    if (error) throw error;
    const cIds = Array.from(new Set((data ?? []).map((p: any) => p.company_id).filter(Boolean))) as string[];
    const cMap = new Map<string, string>();
    if (cIds.length) {
      const { data: cRows } = await supabase.from("companies").select("id, name").in("id", cIds);
      (cRows ?? []).forEach((c: any) => cMap.set(c.id, c.name));
    }
    return (data ?? []).map((p: any) => ({ ...p, company_name: p.company_id ? cMap.get(p.company_id) ?? null : null }));
  },

  async listInternalUsers(): Promise<{ user_id: string; name: string | null }[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, is_internal")
      .eq("is_internal", true)
      .order("name");
    if (error) throw error;
    return (data ?? []).map((p: any) => ({ user_id: p.user_id, name: p.name }));
  },

  async listCompanies(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    if (error) throw error;
    return (data ?? []) as any;
  },
};
