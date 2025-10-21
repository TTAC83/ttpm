import { supabase } from "@/integrations/supabase/client";

export interface TaskUpdateData {
  id?: string;
  taskTitle: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
}

export interface UpdateResult {
  status: 'updated' | 'failed' | 'skipped';
  taskTitle: string;
  message?: string;
}

export const projectDateUpdateService = {
  /**
   * Fetch all task updates configured for a project
   */
  async getProjectTaskUpdates(projectId: string): Promise<TaskUpdateData[]> {
    const { data, error } = await supabase
      .from('project_task_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('task_title');

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      taskTitle: row.task_title,
      plannedStart: row.planned_start || undefined,
      plannedEnd: row.planned_end || undefined,
      actualStart: row.actual_start || undefined,
      actualEnd: row.actual_end || undefined,
    }));
  },

  /**
   * Apply configured task updates to project tasks
   */
  async applyTaskUpdates(projectId: string): Promise<UpdateResult[]> {
    // 1. Fetch configured updates
    const taskUpdates = await this.getProjectTaskUpdates(projectId);

    if (taskUpdates.length === 0) {
      return [{ 
        status: 'skipped', 
        taskTitle: 'No updates configured', 
        message: 'No task updates found for this project' 
      }];
    }

    // 2. Fetch project tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', projectId);

    if (tasksError) throw tasksError;

    const results: UpdateResult[] = [];

    // 3. Match and update each task
    for (const update of taskUpdates) {
      const task = tasks?.find(t => t.task_title === update.taskTitle);

      if (!task) {
        results.push({
          status: 'skipped',
          taskTitle: update.taskTitle,
          message: 'Task not found in project'
        });
        continue;
      }

      // Call the update-task edge function
      try {
        const { error } = await supabase.functions.invoke('update-task', {
          body: {
            id: task.id,
            planned_start: update.plannedStart,
            planned_end: update.plannedEnd,
            actual_start: update.actualStart,
            actual_end: update.actualEnd,
          }
        });

        if (error) {
          results.push({
            status: 'failed',
            taskTitle: update.taskTitle,
            message: error.message
          });
        } else {
          results.push({
            status: 'updated',
            taskTitle: update.taskTitle
          });
        }
      } catch (err: any) {
        results.push({
          status: 'failed',
          taskTitle: update.taskTitle,
          message: err.message
        });
      }
    }

    return results;
  },

  /**
   * Bulk import task updates from CSV/JSON
   */
  async bulkImportTaskUpdates(projectId: string, updates: TaskUpdateData[]): Promise<void> {
    const { data: user } = await supabase.auth.getUser();

    const records = updates.map(update => ({
      project_id: projectId,
      task_title: update.taskTitle,
      planned_start: update.plannedStart,
      planned_end: update.plannedEnd,
      actual_start: update.actualStart,
      actual_end: update.actualEnd,
      created_by: user.user?.id
    }));

    const { error } = await supabase
      .from('project_task_updates')
      .upsert(records, { onConflict: 'project_id,task_title' });

    if (error) throw error;
  },

  /**
   * Delete all task updates for a project
   */
  async clearTaskUpdates(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('project_task_updates')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;
  },

  /**
   * Delete a single task update
   */
  async deleteTaskUpdate(updateId: string): Promise<void> {
    const { error } = await supabase
      .from('project_task_updates')
      .delete()
      .eq('id', updateId);

    if (error) throw error;
  }
};
