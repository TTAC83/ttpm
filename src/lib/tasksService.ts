import { supabase } from "@/integrations/supabase/client";

export interface DashboardTask {
  id: string;
  task_title: string;
  planned_start?: string;
  planned_end?: string;
  status: string;
  project_id: string;
  project_name?: string;
  company_name?: string;
  is_overdue: boolean;
  is_critical: boolean;
  age_days?: number;
}

export const tasksService = {
  // Get overdue or critical (blocked) tasks for dashboard
  async getDashboardTasks() {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        id,
        task_title,
        planned_start,
        planned_end,
        status,
        project_id,
        projects:project_id (
          name,
          companies:company_id (
            name
          )
        )
      `)
      .or('status.eq.Blocked,and(planned_end.lt.now(),planned_end.not.is.null)')
      .neq('status', 'Done')
      .order('status', { ascending: false }) // Blocked tasks first
      .order('planned_end', { ascending: true })
      .limit(10);

    if (error) throw error;

    return (data || []).map(task => {
      const plannedEnd = task.planned_end ? new Date(task.planned_end) : null;
      const today = new Date();
      const isOverdue = plannedEnd && plannedEnd < today;
      const isCritical = task.status === 'Blocked';
      const ageDays = isOverdue && plannedEnd ? Math.floor((today.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

      return {
        ...task,
        project_name: (task.projects as any)?.name || 'Unknown Project',
        company_name: (task.projects as any)?.companies?.name || 'Unknown Company',
        is_overdue: !!isOverdue,
        is_critical: isCritical,
        age_days: ageDays > 0 ? ageDays : undefined
      };
    }) as DashboardTask[];
  }
};