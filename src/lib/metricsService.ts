import { supabase } from "@/integrations/supabase/client";

export type MetricCategory = 'financial' | 'operational' | 'customer' | 'people' | 'quality' | 'other';
export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'on_target';
export type MetricMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Metric {
  id: string;
  title: string;
  category: MetricCategory;
  description: string | null;
  owner: string | null;
  unit: string | null;
  target_value: number | null;
  direction: MetricDirection;
  tolerance: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricReading {
  id: string;
  metric_id: string;
  meeting_id: string | null;
  period_date: string;
  actual_value: number;
  on_target: boolean;
  commentary: string | null;
  created_at: string;
}

export interface MetricMeeting {
  id: string;
  title: string;
  scheduled_at: string;
  status: MetricMeetingStatus;
  notes: string | null;
  created_at: string;
}

export function computeOnTarget(
  actual: number,
  target: number | null,
  direction: MetricDirection,
  tolerance: number | null,
): boolean {
  if (target === null || target === undefined) return true;
  const tol = tolerance ?? 0;
  switch (direction) {
    case 'higher_is_better': return actual >= target - tol;
    case 'lower_is_better':  return actual <= target + tol;
    case 'on_target':        return Math.abs(actual - target) <= tol;
  }
}

export const metricsService = {
  async listMetrics(): Promise<Metric[]> {
    const { data, error } = await supabase
      .from('metrics' as any)
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Metric[];
  },

  async getMetric(id: string): Promise<Metric | null> {
    const { data, error } = await supabase
      .from('metrics' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as Metric | null;
  },

  async createMetric(input: Partial<Metric>): Promise<Metric> {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('metrics' as any)
      .insert({ ...input, created_by: userData.user?.id })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Metric;
  },

  async updateMetric(id: string, patch: Partial<Metric>): Promise<void> {
    const { error } = await supabase.from('metrics' as any).update(patch).eq('id', id);
    if (error) throw error;
  },

  async archiveMetric(id: string): Promise<void> {
    await this.updateMetric(id, { is_archived: true });
  },

  async listReadings(metricId: string): Promise<MetricReading[]> {
    const { data, error } = await supabase
      .from('metric_readings' as any)
      .select('*')
      .eq('metric_id', metricId)
      .order('period_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as MetricReading[];
  },

  async latestReadings(metricIds: string[]): Promise<Record<string, MetricReading | undefined>> {
    if (metricIds.length === 0) return {};
    const { data, error } = await supabase
      .from('metric_readings' as any)
      .select('*')
      .in('metric_id', metricIds)
      .order('period_date', { ascending: false });
    if (error) throw error;
    const map: Record<string, MetricReading> = {};
    for (const r of (data ?? []) as unknown as MetricReading[]) {
      if (!map[r.metric_id]) map[r.metric_id] = r;
    }
    return map;
  },

  async addReading(input: {
    metric_id: string;
    meeting_id?: string | null;
    period_date: string;
    actual_value: number;
    on_target: boolean;
    commentary?: string | null;
  }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('metric_readings' as any)
      .insert({ ...input, entered_by: userData.user?.id });
    if (error) throw error;
  },

  async listMeetings(): Promise<MetricMeeting[]> {
    const { data, error } = await supabase
      .from('metric_meetings' as any)
      .select('*')
      .order('scheduled_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as MetricMeeting[];
  },

  async getMeeting(id: string): Promise<MetricMeeting | null> {
    const { data, error } = await supabase
      .from('metric_meetings' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as MetricMeeting | null;
  },

  async createMeeting(input: { title: string; scheduled_at: string; notes?: string | null; metricIds: string[] }): Promise<MetricMeeting> {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('metric_meetings' as any)
      .insert({ title: input.title, scheduled_at: input.scheduled_at, notes: input.notes ?? null, created_by: userData.user?.id })
      .select()
      .single();
    if (error) throw error;
    const meeting = data as unknown as MetricMeeting;
    if (input.metricIds.length > 0) {
      const { error: linkErr } = await supabase
        .from('metric_meeting_items' as any)
        .insert(input.metricIds.map((m) => ({ meeting_id: meeting.id, metric_id: m })));
      if (linkErr) throw linkErr;
    }
    return meeting;
  },

  async updateMeeting(id: string, patch: Partial<MetricMeeting>): Promise<void> {
    const { error } = await supabase.from('metric_meetings' as any).update(patch).eq('id', id);
    if (error) throw error;
  },

  async listMeetingMetrics(meetingId: string): Promise<Metric[]> {
    const { data, error } = await supabase
      .from('metric_meeting_items' as any)
      .select('metric_id, metrics:metric_id(*)')
      .eq('meeting_id', meetingId);
    if (error) throw error;
    return ((data ?? []) as any[]).map((r) => r.metrics).filter(Boolean) as Metric[];
  },

  async listMeetingActions(meetingId: string) {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('metric_meeting_id', meetingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listMetricActions(metricId: string) {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('metric_id', metricId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createAction(input: {
    title: string;
    details?: string | null;
    planned_date?: string | null;
    is_critical?: boolean;
    metric_id?: string | null;
    metric_meeting_id?: string | null;
  }) {
    const { data, error } = await supabase
      .from('actions')
      .insert({
        title: input.title,
        details: input.details ?? null,
        planned_date: input.planned_date ?? null,
        is_critical: input.is_critical ?? false,
        status: 'planned',
        metric_id: input.metric_id ?? null,
        metric_meeting_id: input.metric_meeting_id ?? null,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
