import { supabase } from "@/integrations/supabase/client";

export interface ProductGap {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  ticket_link?: string;
  assigned_to?: string;
  is_critical: boolean;
  status: 'Live' | 'Closed';
  created_at: string;
  created_by: string;
  estimated_complete_date?: string;
  closed_at?: string;
  resolution_notes?: string;
  feature_request_id?: string;
  updated_at: string;
  // Joined fields
  project_name?: string;
  company_name?: string;
  assigned_to_name?: string;
  created_by_name?: string;
}

export interface DashboardProductGap {
  id: string;
  project_id: string;
  project_name: string;
  company_name: string;
  title: string;
  estimated_complete_date?: string;
  is_critical: boolean;
  status: 'Live' | 'Closed';
  age_days: number;
  feature_request_id?: string;
}

export const productGapsService = {
  async getProjectProductGaps(projectId: string): Promise<ProductGap[]> {
    const { data, error } = await supabase
      .from('product_gaps')
      .select(`
        *,
        projects!inner(name),
        assigned_to_profile:profiles!assigned_to(name),
        created_by_profile:profiles!created_by(name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(gap => ({
      ...gap,
      // Ensure types and derived fields
      status: gap.status as 'Live' | 'Closed',
      project_name: (gap.projects as any)?.name,
      assigned_to_name: (gap.assigned_to_profile as any)?.name,
      created_by_name: (gap.created_by_profile as any)?.name,
      // Explicitly carry feature_request_id
      feature_request_id: (gap as any).feature_request_id ?? undefined,
    }));
  },

  async getAllProductGaps(): Promise<ProductGap[]> {
    const { data, error } = await supabase
      .from('product_gaps')
      .select(`
        *,
        projects!inner(name, company_id, companies!inner(name)),
        assigned_to_profile:profiles!assigned_to(name),
        created_by_profile:profiles!created_by(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(gap => ({
      ...gap,
      status: gap.status as 'Live' | 'Closed',
      project_name: (gap.projects as any)?.name,
      company_name: (gap.projects as any)?.companies?.name,
      assigned_to_name: (gap.assigned_to_profile as any)?.name,
      created_by_name: (gap.created_by_profile as any)?.name,
      feature_request_id: (gap as any).feature_request_id ?? undefined,
    }));
  },

  async getDashboardProductGaps(): Promise<DashboardProductGap[]> {
    const { data, error } = await supabase
      .from('product_gaps')
      .select(`
        id,
        project_id,
        title,
        estimated_complete_date,
        is_critical,
        status,
        created_at,
        feature_request_id,
        projects!inner(name, company_id, companies!inner(name))
      `)
      .eq('status', 'Live')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(gap => ({
      id: gap.id,
      project_id: gap.project_id,
      project_name: (gap.projects as any)?.name || '',
      company_name: (gap.projects as any)?.companies?.name || '',
      title: gap.title,
      estimated_complete_date: gap.estimated_complete_date,
      is_critical: gap.is_critical,
      status: gap.status as 'Live' | 'Closed',
      age_days: Math.floor((new Date().getTime() - new Date(gap.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      feature_request_id: (gap as any).feature_request_id
    }));
  },

  async createProductGap(productGap: Omit<ProductGap, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<ProductGap> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('product_gaps')
      .insert({
        ...productGap,
        created_by: user.id
      })
      .select(`
        *,
        projects!inner(name),
        assigned_to_profile:profiles!assigned_to(name),
        created_by_profile:profiles!created_by(name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      status: data.status as 'Live' | 'Closed',
      project_name: (data.projects as any)?.name,
      assigned_to_name: (data.assigned_to_profile as any)?.name,
      created_by_name: (data.created_by_profile as any)?.name
    };
  },

  async updateProductGap(id: string, updates: Partial<ProductGap>): Promise<ProductGap> {
    const { data, error } = await supabase
      .from('product_gaps')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        projects!inner(name),
        assigned_to_profile:profiles!assigned_to(name),
        created_by_profile:profiles!created_by(name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      status: data.status as 'Live' | 'Closed',
      project_name: (data.projects as any)?.name,
      assigned_to_name: (data.assigned_to_profile as any)?.name,
      created_by_name: (data.created_by_profile as any)?.name
    };
  },

  async deleteProductGap(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_gaps')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};