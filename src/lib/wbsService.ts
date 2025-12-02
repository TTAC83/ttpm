import { supabase } from "@/integrations/supabase/client";

export interface WBSLayout {
  id: string;
  step_name: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  project_id?: string | null;
  updated_by: string;
  updated_at: string;
}

export interface MasterStep {
  id: number;
  step_name: string;
  position: number;
  task_count: number;
  planned_start_offset_days?: number | null;
  planned_end_offset_days?: number | null;
}

export interface MasterTask {
  id: number;
  step_id: number;
  title: string;
  details: string | null;
  planned_start_offset_days: number; // Auto-calculated from dependencies
  planned_end_offset_days: number;   // Auto-calculated from dependencies
  duration_days: number;              // User-defined task duration
  position: number;
  technology_scope: string;
  assigned_role: string;
  parent_task_id: number | null;
  subtasks?: MasterTask[];
}

export interface ProjectTask {
  id: string;
  project_id: string;
  master_task_id: number | null;
  step_name: string;
  task_title: string;
  task_details: string | null;
  planned_start: string | null;
  planned_end: string | null;
  assignee: string | null;
  parent_task_id: string | null;
  subtasks?: ProjectTask[];
}

export interface TaskDependency {
  dependency_id: string;
  predecessor_type: string;
  predecessor_id: number;
  successor_type: string;
  successor_id: number;
  dependency_type: string;
  lag_days: number;
}

export interface ItemWithDependencies {
  item_type: 'step' | 'task' | 'subtask';
  item_id: number;
  predecessors: any[];
  successors: any[];
}

class WBSService {
  async getMasterSteps(): Promise<MasterStep[]> {
    const { data, error } = await supabase
      .from("v_master_steps")
      .select("*")
      .order("position");

    if (error) throw error;
    return data || [];
  }

  async getStepTasks(stepId: number): Promise<MasterTask[]> {
    const { data, error } = await supabase
      .from("master_tasks")
      .select("*")
      .eq("step_id", stepId)
      .order("position");

    if (error) throw error;
    return this.organizeTaskHierarchy(data || []);
  }

  // Organize flat task list into hierarchical structure
  private organizeTaskHierarchy(tasks: any[]): MasterTask[] {
    const taskMap = new Map();
    const rootTasks: MasterTask[] = [];

    // First pass: create all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, subtasks: [] });
    });

    // Second pass: organize hierarchy
    tasks.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id);
      if (task.parent_task_id) {
        const parent = taskMap.get(task.parent_task_id);
        if (parent) {
          parent.subtasks.push(taskWithSubtasks);
        }
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });

    return rootTasks;
  }

  // Create a new sub-task
  async createSubTask(parentTaskId: number, subTask: Omit<MasterTask, "id" | "parent_task_id" | "subtasks">): Promise<void> {
    const { error } = await supabase
      .from("master_tasks")
      .insert({
        ...subTask,
        parent_task_id: parentTaskId
      });

    if (error) throw error;
  }

  // Update a master task
  async updateMasterTask(taskId: number, updates: Partial<MasterTask>): Promise<void> {
    const { parent_task_id, subtasks, ...validUpdates } = updates;
    
    const { error } = await supabase
      .from("master_tasks")
      .update(validUpdates)
      .eq("id", taskId);

    if (error) throw error;

    // If duration changed, recalculate this task and cascade
    if (updates.duration_days !== undefined) {
      const { data: task } = await supabase
        .from("master_tasks")
        .select("parent_task_id, step_id")
        .eq("id", taskId)
        .single();
      
      const itemType = task?.parent_task_id ? 'subtask' : 'task';

      // Get dependencies to decide how to update dates
      const deps = await this.getDependenciesForItem(itemType, taskId);

      if ((deps.predecessors?.length || 0) === 0) {
        // No predecessors: keep start, adjust end to match new duration
        const current = await this.getItemDates(itemType, taskId);
        const start = current.planned_start_offset_days;
        const dur = updates.duration_days ?? current.duration_days ?? 1;
        const newEnd = start + dur;
        await this.updateItemDates(itemType, taskId, start, newEnd, 0);
      } else {
        // Has predecessors: recalc based on dependency rules
        await this.recalculateDatesWithDependencies(itemType, taskId);
      }
      
      // Cascade to all successors
      for (const succ of deps.successors || []) {
        await this.recalculateDatesWithDependencies(succ.successor_type, succ.successor_id);
      }
      
      // Update parent/step dates if needed
      if (task?.parent_task_id) {
        await this.recalculateTaskAndStepDates(task.parent_task_id, task.step_id);
      } else if (task?.step_id) {
        await this.updateStepDatesFromTasks(task.step_id);
      }
    }
  }

  // Delete a master task (and its subtasks due to CASCADE)
  async deleteMasterTask(taskId: number): Promise<void> {
    const { error } = await supabase
      .from("master_tasks")
      .delete()
      .eq("id", taskId);

    if (error) throw error;
  }

  async getWBSLayouts(projectId?: string): Promise<WBSLayout[]> {
    let query = supabase.from("wbs_layouts").select("*");
    
    if (projectId) {
      // Get project-specific layouts
      query = query.eq("project_id", projectId);
    } else {
      // Get global template layouts (project_id is null)
      query = query.is("project_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async saveWBSLayout(layout: Omit<WBSLayout, "id" | "updated_at" | "updated_by">, projectId?: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("User not authenticated");

    // For project-specific layouts, we need to handle the unique constraint properly
    if (projectId) {
      // First, check if a layout already exists for this step and project
      const { data: existing } = await supabase
        .from("wbs_layouts")
        .select("id")
        .eq("step_name", layout.step_name)
        .eq("project_id", projectId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing layout
        const { error } = await supabase
          .from("wbs_layouts")
          .update({
            pos_x: layout.pos_x,
            pos_y: layout.pos_y,
            width: layout.width,
            height: layout.height,
            updated_by: user.user.id
          })
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        // Insert new layout
        const { error } = await supabase
          .from("wbs_layouts")
          .insert({
            ...layout,
            project_id: projectId,
            updated_by: user.user.id
          });
        
        if (error) throw error;
      }
    } else {
      // For global templates, check if a layout already exists for this step
      const { data: existing } = await supabase
        .from("wbs_layouts")
        .select("id")
        .eq("step_name", layout.step_name)
        .is("project_id", null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing layout
        const { error } = await supabase
          .from("wbs_layouts")
          .update({
            pos_x: layout.pos_x,
            pos_y: layout.pos_y,
            width: layout.width,
            height: layout.height,
            updated_by: user.user.id
          })
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        // Insert new layout
        const { error } = await supabase
          .from("wbs_layouts")
          .insert({
            ...layout,
            project_id: null,
            updated_by: user.user.id
          });
        
        if (error) throw error;
      }
    }
  }

  async resetWBSLayout(projectId?: string): Promise<void> {
    let query = supabase.from("wbs_layouts").delete();
    
    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }

    const { error } = await query.neq("id", ""); // Delete all matching records
    if (error) throw error;
  }

  async canUpdateLayout(projectId?: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_internal")
        .eq("user_id", user.user.id)
        .single();

      // For global templates, only internal users can update
      if (!projectId) {
        return !!profile?.is_internal;
      }

      // For project-specific layouts, check if user is a project member
      const { data: projectMember } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.user.id)
        .single();

      return !!projectMember || !!profile?.is_internal;
    } catch {
      return false;
    }
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("planned_start");

    if (error) throw error;
    return data || [];
  }

  // Get project-specific step task counts
  async getProjectSteps(projectId: string): Promise<MasterStep[]> {
    // For now, use master steps with project task counts
    // This could be enhanced later with a proper view
    const masterSteps = await this.getMasterSteps();
    
    // Get task counts for this project
    const { data: projectTasks } = await supabase
      .from("project_tasks")
      .select("step_name")
      .eq("project_id", projectId);

    if (projectTasks) {
      // Count tasks per step for this project
      const stepTaskCounts = projectTasks.reduce((acc, task) => {
        acc[task.step_name] = (acc[task.step_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Update master steps with project-specific task counts
      return masterSteps.map(step => ({
        ...step,
        task_count: stepTaskCounts[step.step_name] || 0
      }));
    }

    return masterSteps;
  }

  // Calculate and update step dates from associated tasks
  async updateStepDatesFromTasks(stepId: number): Promise<void> {
    // Get all tasks for this step
    const { data: tasks, error: tasksError } = await supabase
      .from('master_tasks')
      .select('planned_start_offset_days, planned_end_offset_days')
      .eq('step_id', stepId);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      // No tasks - set dates to null
      const { error: updateError } = await supabase
        .from('master_steps')
        .update({
          planned_start_offset_days: null,
          planned_end_offset_days: null
        })
        .eq('id', stepId);

      if (updateError) throw updateError;
      return;
    }

    // Calculate min start and max end across all tasks
    const startOffsets = tasks
      .map(t => t.planned_start_offset_days)
      .filter((d): d is number => d !== null && d !== undefined);
    
    const endOffsets = tasks
      .map(t => t.planned_end_offset_days)
      .filter((d): d is number => d !== null && d !== undefined);

    const minStart = startOffsets.length > 0 ? Math.min(...startOffsets) : null;
    const maxEnd = endOffsets.length > 0 ? Math.max(...endOffsets) : null;

    // Update the step with calculated dates
    const { error: updateError } = await supabase
      .from('master_steps')
      .update({
        planned_start_offset_days: minStart,
        planned_end_offset_days: maxEnd
      })
      .eq('id', stepId);

    if (updateError) throw updateError;
  }

  // Recalculate all step dates
  async recalculateAllStepDates(): Promise<void> {
    const { data: steps, error } = await supabase
      .from('master_steps')
      .select('id');

    if (error) throw error;

    await Promise.all(
      (steps || []).map(step => this.updateStepDatesFromTasks(step.id))
    );
  }

  /**
   * Recalculate ALL master data to ensure consistency:
   * 1. Parent tasks span earliest subtask start → latest subtask end
   * 2. Tasks with dependencies are dated correctly based on dependency type + lag
   * 3. All step dates are updated from their tasks
   */
  async recalculateAllMasterData(): Promise<{
    tasksUpdated: number;
    stepsUpdated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let tasksUpdated = 0;
    let stepsUpdated = 0;

    try {
      // Get all master tasks and dependencies
      const { data: allTasks, error: tasksError } = await supabase
        .from('master_tasks')
        .select('*')
        .order('step_id, position');

      if (tasksError) throw tasksError;
      if (!allTasks) throw new Error('No tasks found');

      // Get all dependencies
      const dependencies = await this.getAllDependencies();

      // Build dependency graph to process tasks in correct order
      const processedTasks = new Set<number>();
      const tasksToProcess = [...allTasks];
      let maxIterations = allTasks.length * 3; // Prevent infinite loops
      let iteration = 0;

      while (tasksToProcess.length > 0 && iteration < maxIterations) {
        iteration++;
        const initialLength = tasksToProcess.length;
        const task = tasksToProcess.shift();
        if (!task) break;

        // Check if all predecessors have been processed
        const taskDeps = dependencies.filter(
          d => d.successor_type === 'task' && d.successor_id === task.id
        );
        
        const allPredecessorsProcessed = taskDeps.every(dep => 
          processedTasks.has(dep.predecessor_id)
        );

        // If has unprocessed predecessors, put back in queue
        if (!allPredecessorsProcessed && taskDeps.length > 0) {
          tasksToProcess.push(task);
          continue;
        }

        try {
          // Recalculate dates based on dependencies (for all tasks, not just those with deps)
          await this.recalculateDatesWithDependencies('task', task.id);
          tasksUpdated++;

          // If this is a parent task, update dates from subtasks
          const subtasks = allTasks.filter(t => t.parent_task_id === task.id);
          if (subtasks.length > 0) {
            // Process all subtasks first
            for (const subtask of subtasks) {
              if (!processedTasks.has(subtask.id)) {
                await this.recalculateDatesWithDependencies('task', subtask.id);
                processedTasks.add(subtask.id);
              }
            }
            // Then update parent from subtasks
            await this.updateParentTaskDatesFromSubTasks(task.id);
          }

          processedTasks.add(task.id);
        } catch (error: any) {
          errors.push(`Task ${task.id} (${task.title}): ${error.message}`);
          processedTasks.add(task.id); // Mark as processed to avoid infinite loop
        }

        // Check if we're making progress
        if (tasksToProcess.length === initialLength) {
          // No progress made, might be circular dependency
          errors.push(`Circular dependency or processing issue detected. ${tasksToProcess.length} tasks remaining.`);
          break;
        }
      }

      if (iteration >= maxIterations) {
        errors.push('Maximum iterations reached. Possible circular dependency.');
      }

      // Update all step dates from their tasks
      const steps = await this.getMasterSteps();
      for (const step of steps) {
        try {
          await this.updateStepDatesFromTasks(step.id);
          stepsUpdated++;
        } catch (error: any) {
          errors.push(`Step ${step.id} (${step.step_name}): ${error.message}`);
        }
      }

      return { tasksUpdated, stepsUpdated, errors };
    } catch (error: any) {
      errors.push(`Fatal error: ${error.message}`);
      return { tasksUpdated, stepsUpdated, errors };
    }
  }

  // ===== DEPENDENCY MANAGEMENT =====
  
  async getDependenciesForItem(
    itemType: 'step' | 'task' | 'subtask',
    itemId: number
  ): Promise<ItemWithDependencies> {
    const [predecessorsResult, successorsResult] = await Promise.all([
      supabase.rpc('get_item_predecessors', {
        p_item_type: itemType,
        p_item_id: itemId
      }),
      supabase.rpc('get_item_successors', {
        p_item_type: itemType,
        p_item_id: itemId
      })
    ]);

    if (predecessorsResult.error) throw predecessorsResult.error;
    if (successorsResult.error) throw successorsResult.error;

    return {
      item_type: itemType,
      item_id: itemId,
      predecessors: predecessorsResult.data || [],
      successors: successorsResult.data || []
    };
  }

  async createDependency(
    predecessorType: 'step' | 'task' | 'subtask',
    predecessorId: number,
    successorType: 'step' | 'task' | 'subtask',
    successorId: number,
    dependencyType: 'FS' | 'SS' | 'FF' | 'SF' = 'FS',
    lagDays: number = 0
  ): Promise<void> {
    // Prevent circular dependencies
    const isCircular = await this.checkCircularDependency(
      predecessorType,
      predecessorId,
      successorType,
      successorId
    );
    
    if (isCircular) {
      throw new Error('Cannot create dependency: would create circular dependency');
    }

    const { error } = await supabase
      .from('master_task_dependencies')
      .insert({
        predecessor_type: predecessorType,
        predecessor_id: predecessorId,
        successor_type: successorType,
        successor_id: successorId,
        dependency_type: dependencyType,
        lag_days: lagDays
      });

    if (error) throw error;

    // Recalculate dates for successor item
    await this.recalculateDatesWithDependencies(successorType, successorId);
  }

  async deleteDependency(dependencyId: string): Promise<void> {
    const { error } = await supabase
      .from('master_task_dependencies')
      .delete()
      .eq('id', dependencyId);

    if (error) throw error;
  }

  async getAllDependencies(): Promise<any[]> {
    const { data, error } = await supabase
      .from('master_task_dependencies')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  // ===== DATE CASCADING WITH DEPENDENCIES =====

  async recalculateDatesWithDependencies(
    itemType: 'step' | 'task' | 'subtask',
    itemId: number
  ): Promise<void> {
    const deps = await this.getDependenciesForItem(itemType, itemId);
    const itemDates = await this.getItemDates(itemType, itemId);
    
    // Get duration (tasks/subtasks only - steps don't have duration)
    const duration = itemDates.duration_days || 1;
    
    // If no dependencies, align end date to start + duration and exit
    if (deps.predecessors.length === 0) {
      const start = itemDates.planned_start_offset_days;
      const newEnd = start + duration;
      await this.updateItemDates(itemType, itemId, start, newEnd, 0);
      return;
    }
    
    // Track the latest required start/end dates across all dependencies
    let requiredStartDate: number | null = null;
    let requiredEndDate: number | null = null;
    
    for (const pred of deps.predecessors) {
      const predDates = await this.getItemDates(pred.predecessor_type, pred.predecessor_id);
      
      switch (pred.dependency_type) {
        case 'FS': // Finish-to-Start: This task starts after predecessor finishes
          const fsStart = predDates.planned_end_offset_days + pred.lag_days;
          if (requiredStartDate === null || fsStart > requiredStartDate) {
            requiredStartDate = fsStart;
          }
          break;
        
        case 'SS': // Start-to-Start: This task starts when predecessor starts
          const ssStart = predDates.planned_start_offset_days + pred.lag_days;
          if (requiredStartDate === null || ssStart > requiredStartDate) {
            requiredStartDate = ssStart;
          }
          break;
        
        case 'FF': // Finish-to-Finish: This task finishes when predecessor finishes
          const ffEnd = predDates.planned_end_offset_days + pred.lag_days;
          if (requiredEndDate === null || ffEnd > requiredEndDate) {
            requiredEndDate = ffEnd;
          }
          break;
        
        case 'SF': // Start-to-Finish: This task finishes when predecessor starts
          const sfEnd = predDates.planned_start_offset_days + pred.lag_days;
          if (requiredEndDate === null || sfEnd > requiredEndDate) {
            requiredEndDate = sfEnd;
          }
          break;
      }
    }
    
    // Calculate final dates based on dependencies
    let newStartDate: number;
    let newEndDate: number;
    
    if (requiredStartDate !== null && requiredEndDate !== null) {
      // Both start and end constraints - use whichever gives later dates
      newStartDate = requiredStartDate;
      newEndDate = Math.max(requiredEndDate, requiredStartDate + duration);
    } else if (requiredStartDate !== null) {
      // Only start constraint
      newStartDate = requiredStartDate;
      newEndDate = requiredStartDate + duration;
    } else if (requiredEndDate !== null) {
      // Only end constraint
      newEndDate = requiredEndDate;
      newStartDate = requiredEndDate - duration;
    } else {
      // No dependencies processed (shouldn't happen due to early return)
      return;
    }
    
    
    // Always update dates when dependencies exist (force to calculated position)
    // Calculate the offset to shift subtasks
    const offsetDays = newStartDate - itemDates.planned_start_offset_days;
    
    await this.updateItemDates(itemType, itemId, newStartDate, newEndDate, offsetDays);
    
    // If this is a task (not subtask), shift all subsequent tasks in the same step
    if (itemType === 'task' && offsetDays !== 0) {
      await this.shiftSubsequentTasks(itemId, offsetDays);
    }
    
    // Cascade recalculation to successor tasks
    for (const succ of deps.successors) {
      await this.recalculateDatesWithDependencies(succ.successor_type, succ.successor_id);
    }
  }

  private async getItemDates(
    itemType: 'step' | 'task' | 'subtask',
    itemId: number
  ): Promise<{ planned_start_offset_days: number; planned_end_offset_days: number; duration_days?: number }> {
    if (itemType === 'step') {
      const { data, error } = await supabase
        .from('master_steps')
        .select('planned_start_offset_days, planned_end_offset_days')
        .eq('id', itemId)
        .single();
      if (error) throw error;
      return {
        planned_start_offset_days: data.planned_start_offset_days || 0,
        planned_end_offset_days: data.planned_end_offset_days || 0
      };
    } else {
      const { data, error } = await supabase
        .from('master_tasks')
        .select('planned_start_offset_days, planned_end_offset_days, duration_days')
        .eq('id', itemId)
        .single();
      if (error) throw error;
      return data;
    }
  }

  private async updateItemDates(
    itemType: 'step' | 'task' | 'subtask',
    itemId: number,
    startDays: number,
    endDays: number,
    offsetDays: number = 0
  ): Promise<void> {
    const table = itemType === 'step' ? 'master_steps' : 'master_tasks';
    const { error } = await supabase
      .from(table)
      .update({
        planned_start_offset_days: startDays,
        planned_end_offset_days: endDays
      })
      .eq('id', itemId);
    
    if (error) throw error;

    // If this is a task (not subtask) and there's an offset, shift all descendant subtasks
    if (itemType === 'task' && offsetDays !== 0) {
      await this.shiftSubtasksRecursive(itemId, offsetDays);
    }
  }
  
  // Recursively shift all descendant subtasks by offsetDays, clamping to parent boundaries
  private async shiftSubtasksRecursive(parentId: number, offsetDays: number): Promise<void> {
    // Get parent task dates to use as boundaries
    const { data: parent, error: parentError } = await supabase
      .from('master_tasks')
      .select('planned_start_offset_days, planned_end_offset_days')
      .eq('id', parentId)
      .single();
    
    if (parentError) throw parentError;
    if (!parent) return;

    const parentStart = parent.planned_start_offset_days ?? 0;
    const parentEnd = parent.planned_end_offset_days ?? 0;

    const { data: subtasks, error } = await supabase
      .from('master_tasks')
      .select('id, planned_start_offset_days, planned_end_offset_days')
      .eq('parent_task_id', parentId);
    
    if (error) throw error;
    if (!subtasks || subtasks.length === 0) return;

    for (const sub of subtasks) {
      const newStart = (sub.planned_start_offset_days ?? 0) + offsetDays;
      const newEnd = (sub.planned_end_offset_days ?? 0) + offsetDays;
      
      // Clamp to parent boundaries
      const clampedStart = Math.max(parentStart, Math.min(newStart, parentEnd));
      const clampedEnd = Math.max(parentStart, Math.min(newEnd, parentEnd));
      
      await supabase
        .from('master_tasks')
        .update({
          planned_start_offset_days: clampedStart,
          planned_end_offset_days: clampedEnd,
        })
        .eq('id', sub.id);
      
      // Recursively shift this subtask's children
      await this.shiftSubtasksRecursive(sub.id, offsetDays);
    }
  }
  
  // Shift all subsequent tasks (higher position) in the same step
  private async shiftSubsequentTasks(taskId: number, offsetDays: number): Promise<void> {
    // Get the task's step_id and position
    const { data: task, error: taskError } = await supabase
      .from('master_tasks')
      .select('step_id, position')
      .eq('id', taskId)
      .single();
    
    if (taskError) throw taskError;
    if (!task) return;

    // Get all tasks in the same step with higher position
    const { data: subsequentTasks, error: tasksError } = await supabase
      .from('master_tasks')
      .select('id, planned_start_offset_days, planned_end_offset_days')
      .eq('step_id', task.step_id)
      .gt('position', task.position)
      .is('parent_task_id', null); // Only root tasks, not subtasks
    
    if (tasksError) throw tasksError;
    if (!subsequentTasks || subsequentTasks.length === 0) return;

    // Shift each subsequent task and its subtasks
    for (const subTask of subsequentTasks) {
      await supabase
        .from('master_tasks')
        .update({
          planned_start_offset_days: (subTask.planned_start_offset_days ?? 0) + offsetDays,
          planned_end_offset_days: (subTask.planned_end_offset_days ?? 0) + offsetDays,
        })
        .eq('id', subTask.id);
      
      // Recursively shift all subtasks of this task
      await this.shiftSubtasksRecursive(subTask.id, offsetDays);
    }
  }
  
  private async checkCircularDependency(
    predecessorType: string,
    predecessorId: number,
    successorType: string,
    successorId: number
  ): Promise<boolean> {
    if (predecessorType === successorType && predecessorId === successorId) {
      return true;
    }

    const visited = new Set<string>();
    const stack: Array<{type: string, id: number}> = [{type: successorType, id: successorId}];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = `${current.type}-${current.id}`;
      
      if (visited.has(key)) continue;
      visited.add(key);

      if (current.type === predecessorType && current.id === predecessorId) {
        return true;
      }

      const { data } = await supabase.rpc('get_item_predecessors', {
        p_item_type: current.type,
        p_item_id: current.id
      });

      if (data) {
        for (const dep of data) {
          stack.push({type: dep.predecessor_type, id: dep.predecessor_id});
        }
      }
    }

    return false;
  }

  // Calculate and update parent task dates from sub-tasks
  async updateParentTaskDatesFromSubTasks(parentTaskId: number): Promise<void> {
    // Get all sub-tasks for this parent task (only direct children)
    const { data: subTasks, error: subTasksError } = await supabase
      .from('master_tasks')
      .select('planned_start_offset_days, planned_end_offset_days')
      .eq('parent_task_id', parentTaskId);

    if (subTasksError) throw subTasksError;

    if (!subTasks || subTasks.length === 0) {
      // No sub-tasks - leave parent dates as they are (manual dates)
      return;
    }

    // Calculate min start and max end across all sub-tasks
    const startOffsets = subTasks
      .map(t => t.planned_start_offset_days)
      .filter((d): d is number => d !== null && d !== undefined);
    
    const endOffsets = subTasks
      .map(t => t.planned_end_offset_days)
      .filter((d): d is number => d !== null && d !== undefined);

    const minStart = startOffsets.length > 0 ? Math.min(...startOffsets) : null;
    const maxEnd = endOffsets.length > 0 ? Math.max(...endOffsets) : null;

    // Update the parent task with calculated dates
    const { error: updateError } = await supabase
      .from('master_tasks')
      .update({
        planned_start_offset_days: minStart,
        planned_end_offset_days: maxEnd
      })
      .eq('id', parentTaskId);

    if (updateError) throw updateError;
  }

  // Recalculate task and step dates after sub-task changes (cascading recalculation)
  async recalculateTaskAndStepDates(taskId: number, stepId: number): Promise<void> {
    // First update the parent task dates from its sub-tasks
    await this.updateParentTaskDatesFromSubTasks(taskId);
    
    // Then update the step dates from all tasks in the step
    await this.updateStepDatesFromTasks(stepId);
  }
}

export const wbsService = new WBSService();