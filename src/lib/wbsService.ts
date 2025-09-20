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
    return data || [];
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
      // For global templates, use upsert with the unique index
      const { error } = await supabase
        .from("wbs_layouts")
        .upsert({
          ...layout,
          project_id: null,
          updated_by: user.user.id
        });
      
      if (error) throw error;
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
}

export const wbsService = new WBSService();