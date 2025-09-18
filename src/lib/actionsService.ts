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
    // Build local today (YYYY-MM-DD) so overdue is strictly before today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

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
      .or(`is_critical.eq.true,and(planned_date.lt.${todayStr})`)
      .neq('status', 'Done')
      .order('is_critical', { ascending: false })
      .order('planned_date', { ascending: true })
      .limit(10);

    if (error) throw error;

    return (data || []).map(action => {
      const plannedDate = action.planned_date ? new Date(action.planned_date) : null;
      const today = new Date();
      const isOverdue = plannedDate && plannedDate < today;
      const ageDays = plannedDate ? Math.floor((today.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

      return {
        ...action,
        project_name: (action.projects as any)?.name || 'Unknown Project',
        company_name: (action.projects as any)?.companies?.name || 'Unknown Company',
        is_overdue: !!isOverdue,
        age_days: ageDays > 0 ? ageDays : undefined
      };
    }) as DashboardAction[];
  }
};
