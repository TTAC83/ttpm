import { supabase } from "@/integrations/supabase/client";

export interface DashboardAction {
  id: string;
  title: string;
  planned_date?: string;
  status: string;
  is_critical: boolean;
  project_id?: string;
  project_task_id?: string;
  assignee?: string;
  project_name?: string;
  company_name?: string;
  is_overdue: boolean;
  age_days?: number;
}

export const actionsService = {
  // Get critical or overdue actions for dashboard
  async getDashboardActions() {
    // Build today in UK timezone (YYYY-MM-DD) so overdue is strictly before today
    const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // en-CA gives YYYY-MM-DD format

    const { data, error } = await supabase
      .from('actions')
      .select(`
        id,
        title,
        planned_date,
        status,
        is_critical,
        project_id,
        project_task_id,
        assignee,
        projects:project_id (
          name,
          companies:company_id (
            name
          )
        )
      `)
      .or(`is_critical.eq.true,and(planned_date.lt.${ukToday})`)
      .not('status', 'in', '("Completed","Cancelled","Done","Complete")')
      .order('is_critical', { ascending: false })
      .order('planned_date', { ascending: true })
      .limit(10);

    if (error) throw error;

    return (data || []).map(action => {
      const plannedDateStr = action.planned_date || undefined;
      // Compare using date-only strings to avoid timezone issues
      const isOverdue = plannedDateStr ? plannedDateStr < ukToday : false;

      // Age in days using UK timezone
      let ageDays: number | undefined = undefined;
      if (plannedDateStr) {
        const plannedDate = new Date(`${plannedDateStr}T00:00:00`);
        const ukTodayDate = new Date(`${ukToday}T00:00:00`);
        const diffMs = ukTodayDate.getTime() - plannedDate.getTime();
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        ageDays = d > 0 ? d : undefined;
      }

      return {
        ...action,
        project_name: (action.projects as any)?.name || 'Unknown Project',
        company_name: (action.projects as any)?.companies?.name || 'Unknown Company',
        is_overdue: !!isOverdue,
        age_days: ageDays
      } as DashboardAction;
    });
  }
};
