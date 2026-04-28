import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type GospaStatus = Database["public"]["Enums"]["gospa_status"];
export type GospaRag = Database["public"]["Enums"]["gospa_rag"];
export type GospaSeverity = Database["public"]["Enums"]["gospa_severity"];
export type GospaBlockerLink = Database["public"]["Enums"]["gospa_blocker_link"];
export type GospaMetricFreq = Database["public"]["Enums"]["gospa_metric_freq"];
export type GospaMetricTrend = Database["public"]["Enums"]["gospa_metric_trend"];

export type Goal = Database["public"]["Tables"]["gospa_goals"]["Row"];
export type Objective = Database["public"]["Tables"]["gospa_objectives"]["Row"];
export type Question = Database["public"]["Tables"]["gospa_questions"]["Row"];
export type Strategy = Database["public"]["Tables"]["gospa_strategies"]["Row"];
export type Plan = Database["public"]["Tables"]["gospa_plans"]["Row"];
export type Metric = Database["public"]["Tables"]["gospa_metrics"]["Row"];
export type MetricHistory = Database["public"]["Tables"]["gospa_metric_history"]["Row"];
export type Decision = Database["public"]["Tables"]["gospa_decisions"]["Row"];
export type Blocker = Database["public"]["Tables"]["gospa_blockers"]["Row"];
export type WeeklyReview = Database["public"]["Tables"]["gospa_weekly_reviews"]["Row"];

export const gospa = {
  // Goals
  listGoals: () => supabase.from("gospa_goals").select("*").order("created_at", { ascending: false }),
  createGoal: (g: Partial<Goal>) =>
    supabase.from("gospa_goals").insert({ title: g.title!, ...g }).select().single(),
  updateGoal: (id: string, patch: Partial<Goal>) =>
    supabase.from("gospa_goals").update(patch).eq("id", id).select().single(),
  deleteGoal: (id: string) => supabase.from("gospa_goals").delete().eq("id", id),

  // Objectives
  listObjectives: (goalId?: string) => {
    let q = supabase.from("gospa_objectives").select("*").order("order_index");
    if (goalId) q = q.eq("goal_id", goalId);
    return q;
  },
  getObjective: (id: string) => supabase.from("gospa_objectives").select("*").eq("id", id).single(),
  createObjective: (o: Partial<Objective>) =>
    supabase.from("gospa_objectives").insert({ title: o.title!, goal_id: o.goal_id!, ...o }).select().single(),
  updateObjective: (id: string, patch: Partial<Objective>) =>
    supabase.from("gospa_objectives").update(patch).eq("id", id).select().single(),
  deleteObjective: (id: string) => supabase.from("gospa_objectives").delete().eq("id", id),

  // Questions
  listQuestions: (objectiveId: string) =>
    supabase.from("gospa_questions").select("*").eq("objective_id", objectiveId).order("order_index"),
  createQuestion: (q: { objective_id: string; question_text: string; order_index: number }) =>
    supabase.from("gospa_questions").insert(q).select().single(),
  updateQuestion: (id: string, patch: Partial<Question>) =>
    supabase.from("gospa_questions").update({ ...patch, last_updated: new Date().toISOString() }).eq("id", id).select().single(),
  deleteQuestion: (id: string) => supabase.from("gospa_questions").delete().eq("id", id),

  // Question entries (per-user attributed Summary / Risk / Opportunity / Link rows)
  listQuestionEntries: (questionId: string) =>
    supabase.from("gospa_question_entries").select("*").eq("question_id", questionId).order("created_at"),
  listQuestionEntriesForObjective: async (objectiveId: string) => {
    const { data: qs } = await supabase.from("gospa_questions").select("id").eq("objective_id", objectiveId);
    const ids = (qs ?? []).map(q => q.id);
    if (!ids.length) return { data: [] as any[], error: null } as any;
    return supabase.from("gospa_question_entries").select("*").in("question_id", ids).order("created_at");
  },
  createQuestionEntry: (e: { question_id: string; entry_type: "summary"|"risk"|"opportunity"|"link"; content: string }) =>
    supabase.from("gospa_question_entries").insert(e).select().single(),
  updateQuestionEntry: (id: string, content: string) =>
    supabase.from("gospa_question_entries").update({ content }).eq("id", id).select().single(),
  deleteQuestionEntry: (id: string) =>
    supabase.from("gospa_question_entries").delete().eq("id", id),

  // Strategies
  listStrategies: (objectiveId?: string) => {
    let q = supabase.from("gospa_strategies").select("*").order("created_at");
    if (objectiveId) q = q.eq("objective_id", objectiveId);
    return q;
  },
  createStrategy: (s: Partial<Strategy>) =>
    supabase.from("gospa_strategies").insert({ title: s.title!, objective_id: s.objective_id!, ...s }).select().single(),
  updateStrategy: (id: string, patch: Partial<Strategy>) =>
    supabase.from("gospa_strategies").update(patch).eq("id", id).select().single(),
  deleteStrategy: (id: string) => supabase.from("gospa_strategies").delete().eq("id", id),

  // Plans
  listPlans: (strategyId?: string) => {
    let q = supabase.from("gospa_plans").select("*").order("start_date", { nullsFirst: false });
    if (strategyId) q = q.eq("strategy_id", strategyId);
    return q;
  },
  listAllPlans: () => supabase.from("gospa_plans").select("*, gospa_strategies!inner(objective_id, title)"),
  createPlan: (p: Partial<Plan>) =>
    supabase.from("gospa_plans").insert({ title: p.title!, strategy_id: p.strategy_id!, ...p }).select().single(),
  updatePlan: (id: string, patch: Partial<Plan>) =>
    supabase.from("gospa_plans").update(patch).eq("id", id).select().single(),
  deletePlan: (id: string) => supabase.from("gospa_plans").delete().eq("id", id),

  // Actions (project_tasks)
  listActions: (filters: { objectiveId?: string; planId?: string } = {}) => {
    let q = supabase
      .from("project_tasks")
      .select("id, task_title, status, planned_start, planned_end, actual_start, actual_end, assignee, gospa_plan_id, gospa_objective_id, gospa_strategy_id, gospa_flag, project_id, solutions_project_id")
      .eq("gospa_flag", true)
      .order("planned_end", { nullsFirst: false });
    if (filters.objectiveId) q = q.eq("gospa_objective_id", filters.objectiveId);
    if (filters.planId) q = q.eq("gospa_plan_id", filters.planId);
    return q;
  },
  createAction: (a: { task_title: string; gospa_plan_id: string; planned_start?: string | null; planned_end?: string | null; assignee?: string | null; status?: "Planned" | "In Progress" | "Done" | "Blocked"; }) =>
    supabase.from("project_tasks").insert({
      task_title: a.task_title,
      step_name: "GOSPA",
      gospa_plan_id: a.gospa_plan_id,
      gospa_flag: true,
      planned_start: a.planned_start ?? null,
      planned_end: a.planned_end ?? null,
      assignee: a.assignee ?? null,
      status: a.status ?? "Planned",
    }).select().single(),
  updateAction: (id: string, patch: { task_title?: string; status?: "Planned" | "In Progress" | "Done" | "Blocked"; planned_start?: string | null; planned_end?: string | null; assignee?: string | null; gospa_plan_id?: string; }) =>
    supabase.from("project_tasks").update(patch).eq("id", id).select().single(),
  deleteAction: (id: string) => supabase.from("project_tasks").delete().eq("id", id),

  // Metrics
  listMetrics: (objectiveId?: string) => {
    let q = supabase.from("gospa_metrics").select("*").order("created_at");
    if (objectiveId) q = q.eq("objective_id", objectiveId);
    return q;
  },
  createMetric: (m: Partial<Metric>) =>
    supabase.from("gospa_metrics").insert({ name: m.name!, objective_id: m.objective_id!, ...m }).select().single(),
  updateMetric: (id: string, patch: Partial<Metric>) =>
    supabase.from("gospa_metrics").update({ ...patch, last_updated: new Date().toISOString() }).eq("id", id).select().single(),
  deleteMetric: (id: string) => supabase.from("gospa_metrics").delete().eq("id", id),
  recordMetricValue: async (metricId: string, value: number) => {
    const { data: hist, error } = await supabase
      .from("gospa_metric_history").insert({ metric_id: metricId, value }).select().single();
    if (error) throw error;
    // Update current value + trend
    const { data: history } = await supabase
      .from("gospa_metric_history").select("value").eq("metric_id", metricId)
      .order("recorded_at", { ascending: false }).limit(2);
    let trend: GospaMetricTrend = "flat";
    if (history && history.length === 2) {
      if (history[0].value > history[1].value) trend = "up";
      else if (history[0].value < history[1].value) trend = "down";
    }
    await supabase.from("gospa_metrics").update({
      current_value: value, trend, last_updated: new Date().toISOString(),
    }).eq("id", metricId);
    return hist;
  },
  metricHistory: (metricId: string) =>
    supabase.from("gospa_metric_history").select("*").eq("metric_id", metricId).order("recorded_at"),

  // Decisions
  listDecisions: (objectiveId?: string) => {
    let q = supabase.from("gospa_decisions").select("*").order("decision_date", { ascending: false });
    if (objectiveId) q = q.eq("objective_id", objectiveId);
    return q;
  },
  createDecision: (d: Partial<Decision>) =>
    supabase.from("gospa_decisions").insert({ description: d.description!, objective_id: d.objective_id!, ...d }).select().single(),
  updateDecision: (id: string, patch: Partial<Decision>) =>
    supabase.from("gospa_decisions").update(patch).eq("id", id).select().single(),
  deleteDecision: (id: string) => supabase.from("gospa_decisions").delete().eq("id", id),

  // Blockers
  listBlockers: (filter?: { linkedType?: GospaBlockerLink; linkedId?: string }) => {
    let q = supabase.from("gospa_blockers").select("*").order("created_at", { ascending: false });
    if (filter?.linkedType) q = q.eq("linked_type", filter.linkedType);
    if (filter?.linkedId) q = q.eq("linked_id", filter.linkedId);
    return q;
  },
  createBlocker: (b: Partial<Blocker>) =>
    supabase.from("gospa_blockers").insert({
      description: b.description!, linked_id: b.linked_id!, linked_type: b.linked_type!, ...b,
    }).select().single(),
  updateBlocker: (id: string, patch: Partial<Blocker>) =>
    supabase.from("gospa_blockers").update(patch).eq("id", id).select().single(),
  deleteBlocker: (id: string) => supabase.from("gospa_blockers").delete().eq("id", id),

  // Weekly review
  getWeeklyReview: (weekStart: string) =>
    supabase.from("gospa_weekly_reviews").select("*").eq("week_start", weekStart).maybeSingle(),
  upsertWeeklyReview: (weekStart: string, summaryMd: string) =>
    supabase.from("gospa_weekly_reviews").upsert({ week_start: weekStart, summary_md: summaryMd }, { onConflict: "week_start" }).select().single(),
};

// AI helpers (call edge functions)
export const gospaAI = {
  summariseQuestions: (objectiveId: string) =>
    supabase.functions.invoke("gospa-summarise-questions", { body: { objectiveId } }),
  suggestStrategies: (objectiveId: string) =>
    supabase.functions.invoke("gospa-suggest-strategies", { body: { objectiveId } }),
  qualityCheck: () =>
    supabase.functions.invoke("gospa-quality-check", { body: {} }),
  weeklySummary: (weekStart: string) =>
    supabase.functions.invoke("gospa-weekly-summary", { body: { weekStart } }),
};
