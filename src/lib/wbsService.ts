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
  planned_start_offset_days: number;
  planned_end_offset_days: number;
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

    // If dates changed, cascade to successors
    if (updates.planned_start_offset_days !== undefined || 
        updates.planned_end_offset_days !== undefined) {
      
      const { data: task } = await supabase
        .from("master_tasks")
        .select("parent_task_id")
        .eq("id", taskId)
        .single();
      
      const itemType = task?.parent_task_id ? 'subtask' : 'task';
      
      const deps = await this.getDependenciesForItem(itemType, taskId);
      for (const succ of deps.successors) {
        await this.recalculateDatesWithDependencies(succ.successor_type, succ.successor_id);
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
        .single();

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
        .single();

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
    
    let newStartDate = itemDates.planned_start_offset_days;
    let newEndDate = itemDates.planned_end_offset_days;
    
    for (const pred of deps.predecessors) {
      const predDates = await this.getItemDates(pred.predecessor_type, pred.predecessor_id);
      
      switch (pred.dependency_type) {
        case 'FS':
          const requiredStart = predDates.planned_end_offset_days + pred.lag_days;
          if (requiredStart > newStartDate) {
            newStartDate = requiredStart;
            newEndDate = newStartDate + (itemDates.planned_end_offset_days - itemDates.planned_start_offset_days);
          }
          break;
        
        case 'SS':
          const requiredStartSS = predDates.planned_start_offset_days + pred.lag_days;
          if (requiredStartSS > newStartDate) {
            newStartDate = requiredStartSS;
            newEndDate = newStartDate + (itemDates.planned_end_offset_days - itemDates.planned_start_offset_days);
          }
          break;
        
        case 'FF':
          const requiredEndFF = predDates.planned_end_offset_days + pred.lag_days;
          if (requiredEndFF > newEndDate) {
            newEndDate = requiredEndFF;
          }
          break;
        
        case 'SF':
          const requiredEndSF = predDates.planned_start_offset_days + pred.lag_days;
          if (requiredEndSF > newEndDate) {
            newEndDate = requiredEndSF;
          }
          break;
      }
    }
    
    if (newStartDate !== itemDates.planned_start_offset_days || 
        newEndDate !== itemDates.planned_end_offset_days) {
      
      // Calculate the offset to shift subtasks
      const offsetDays = newStartDate - itemDates.planned_start_offset_days;
      
      await this.updateItemDates(itemType, itemId, newStartDate, newEndDate, offsetDays);
      
      // If this is a task (not subtask), shift all subsequent tasks in the same step
      if (itemType === 'task' && offsetDays !== 0) {
        await this.shiftSubsequentTasks(itemId, offsetDays);
      }
      
      for (const succ of deps.successors) {
        await this.recalculateDatesWithDependencies(succ.successor_type, succ.successor_id);
      }
    }
  }

  private async getItemDates(
    itemType: 'step' | 'task' | 'subtask',
    itemId: number
  ): Promise<{ planned_start_offset_days: number; planned_end_offset_days: number }> {
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
        .select('planned_start_offset_days, planned_end_offset_days')
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