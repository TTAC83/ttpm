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
    // Build today in UK timezone (YYYY-MM-DD) so overdue is strictly before today
    const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // en-CA gives YYYY-MM-DD format
    console.log('[Tasks] ukToday =', ukToday);

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
      .or(`status.eq.Blocked,and(planned_end.lt.${ukToday})`)
      .neq('status', 'Done')
      .order('status', { ascending: false }) // Blocked tasks first
      .order('planned_end', { ascending: true })
      .limit(10);

    console.log('[Tasks] Query filter:', `status.eq.Blocked,and(planned_end.lt.${ukToday})`);
    if (error) {
      console.error('[Tasks] Query error:', error);
      throw error;
    }
    
    console.log('[Tasks] Raw data returned:', data?.length, 'tasks');

    return (data || []).map(task => {
      const plannedEndStr = task.planned_end || undefined;
      // Compare using date-only strings to avoid timezone issues
      const isOverdue = plannedEndStr ? plannedEndStr < ukToday : false;
      const isCritical = task.status === 'Blocked';
      
      // Age in days using UK timezone
      let ageDays: number | undefined = undefined;
      if (plannedEndStr) {
        const plannedDate = new Date(`${plannedEndStr}T00:00:00`);
        const ukTodayDate = new Date(`${ukToday}T00:00:00`);
        const diffMs = ukTodayDate.getTime() - plannedDate.getTime();
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        ageDays = d > 0 ? d : undefined;
      }

      return {
        ...task,
        project_name: (task.projects as any)?.name || 'Unknown Project',
        company_name: (task.projects as any)?.companies?.name || 'Unknown Company',
        is_overdue: !!isOverdue,
        is_critical: isCritical,
        age_days: ageDays
      };
    }) as DashboardTask[];
  },

  // Update a project task
  async updateTask(taskId: string, updates: Partial<{
    task_title: string;
    task_details: string;
    planned_start: string;
    planned_end: string;
    actual_start: string;
    actual_end: string;
    status: "In Progress" | "Done" | "Planned" | "Blocked";
    assignee: string;
  }>) {
    const { assignee, ...otherUpdates } = updates;
    
    const { data, error } = await supabase
      .from('project_tasks')
      .update({
        ...otherUpdates,
        assignee: assignee === 'unassigned' ? null : assignee,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('[Tasks] Update error:', error);
      throw error;
    }

    return data;
  }
};