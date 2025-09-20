import { supabase } from "@/integrations/supabase/client";

export interface WBSLayout {
  id: string;
  step_name: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
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

  async getWBSLayouts(): Promise<WBSLayout[]> {
    const { data, error } = await supabase
      .from("wbs_layouts")
      .select("*");

    if (error) throw error;
    return data || [];
  }

  async saveWBSLayout(layout: Omit<WBSLayout, "id" | "updated_at" | "updated_by">): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("wbs_layouts")
      .upsert({
        ...layout,
        updated_by: user.user.id
      }, {
        onConflict: "step_name"
      });

    if (error) throw error;
  }

  async resetWBSLayout(): Promise<void> {
    const { error } = await supabase
      .from("wbs_layouts")
      .delete()
      .neq("id", ""); // Delete all records

    if (error) throw error;
  }

  async canUpdateLayout(): Promise<boolean> {
    try {
      // Check if user is internal (only internal users can update master layout)
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_internal")
        .eq("user_id", user.user.id)
        .single();

      return !!profile?.is_internal;
    } catch {
      return false;
    }
  }
}

export const wbsService = new WBSService();