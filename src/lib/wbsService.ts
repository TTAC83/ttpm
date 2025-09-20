import { supabase } from "@/integrations/supabase/client";

export interface WBSLayout {
  id: string;
  project_id: string;
  step_name: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  updated_by: string;
  updated_at: string;
}

export interface ProjectStep {
  project_id: string;
  step_name: string;
  task_count: number;
}

export interface WBSTask {
  id: string;
  task_title: string;
  status: string;
  assignee: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  project_id: string;
  step_name?: string;
  task_details?: string;
  assignee_profile?: {
    name: string;
    avatar_url?: string;
  } | null;
}

export interface ImplementationProject {
  id: string;
  name: string;
  site_name?: string;
  company_name: string;
  domain: string;
}

class WBSService {
  async getImplementationProjects(): Promise<ImplementationProject[]> {
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        site_name,
        domain,
        companies!inner(name)
      `)
      .in("domain", ["IoT", "Vision", "Hybrid"])
      .order("name");

    if (error) throw error;

    return data.map(project => ({
      id: project.id,
      name: project.name,
      site_name: project.site_name,
      company_name: project.companies.name,
      domain: project.domain
    }));
  }

  async getProjectSteps(projectId: string): Promise<ProjectStep[]> {
    const { data, error } = await supabase
      .from("v_project_steps")
      .select("*")
      .eq("project_id", projectId)
      .order("step_name");

    if (error) throw error;
    return data || [];
  }

  async getStepTasks(projectId: string, stepName: string): Promise<WBSTask[]> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select(`
        id,
        task_title,
        task_details,
        status,
        assignee,
        planned_start,
        planned_end,
        actual_start,
        actual_end,
        project_id,
        step_name,
        assignee_profile:profiles(name, avatar_url)
      `)
      .eq("project_id", projectId)
      .eq("step_name", stepName)
      .order("planned_start", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getWBSLayouts(projectId: string): Promise<WBSLayout[]> {
    const { data, error } = await supabase
      .from("wbs_layouts")
      .select("*")
      .eq("project_id", projectId);

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
        onConflict: "project_id,step_name"
      });

    if (error) throw error;
  }

  async resetWBSLayout(projectId: string): Promise<void> {
    const { error } = await supabase
      .from("wbs_layouts")
      .delete()
      .eq("project_id", projectId);

    if (error) throw error;
  }

  async canUpdateLayout(projectId: string): Promise<boolean> {
    try {
      // Test by attempting to read with the update policy
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // Check if user is internal
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_internal")
        .eq("user_id", user.user.id)
        .single();

      if (profile?.is_internal) return true;

      // Check if user is project member
      const { data: membership } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.user.id)
        .single();

      return !!membership;
    } catch {
      return false;
    }
  }
}

export const wbsService = new WBSService();