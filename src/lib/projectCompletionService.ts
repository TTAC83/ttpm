import { supabase } from '@/integrations/supabase/client';

export interface ProjectCompletion {
  projectId: string;
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
}

/**
 * Calculate project completion percentage based on tasks and subtasks
 * A task is considered complete if:
 * - It has status "Done" OR
 * - It has actual_end date set
 */
export const calculateProjectCompletion = async (projectId: string): Promise<ProjectCompletion> => {
  try {
    // Get all tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, status, actual_end')
      .eq('project_id', projectId);

    if (tasksError) throw tasksError;

    const totalTasks = tasks?.length || 0;
    
    // Count completed tasks (status = "Done" OR has actual_end date)
    const completedTasks = tasks?.filter(task => 
      task.status === 'Done' || task.actual_end !== null
    ).length || 0;

    // Get all subtasks for the project's tasks
    const taskIds = tasks?.map(task => task.id) || [];
    let totalSubtasks = 0;
    let completedSubtasks = 0;

    if (taskIds.length > 0) {
      const { data: subtasks, error: subtasksError } = await supabase
        .from('project_tasks')
        .select('status, actual_end')
        .in('parent_task_id', taskIds);

      if (!subtasksError && subtasks) {
        totalSubtasks = subtasks.length;
        completedSubtasks = subtasks.filter(subtask => 
          subtask.status === 'Done' || subtask.actual_end !== null
        ).length;
      }
    }

    const totalItems = totalTasks + totalSubtasks;
    const completedItems = completedTasks + completedSubtasks;
    
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      projectId,
      completionPercentage,
      totalTasks: totalItems,
      completedTasks: completedItems,
    };
  } catch (error) {
    console.error('Error calculating project completion:', error);
    return {
      projectId,
      completionPercentage: 0,
      totalTasks: 0,
      completedTasks: 0,
    };
  }
};

/**
 * Calculate completion for multiple projects
 */
export const calculateMultipleProjectCompletions = async (projectIds: string[]): Promise<Map<string, ProjectCompletion>> => {
  const completions = new Map<string, ProjectCompletion>();
  
  // Process projects in parallel for better performance
  const promises = projectIds.map(projectId => calculateProjectCompletion(projectId));
  const results = await Promise.all(promises);
  
  results.forEach(completion => {
    completions.set(completion.projectId, completion);
  });
  
  return completions;
};