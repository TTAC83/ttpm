import { supabase } from "@/integrations/supabase/client";

export type FeatureRequestStatus = 'Requested' | 'Rejected' | 'In Design' | 'In Dev' | 'Complete';

export interface FeatureRequest {
  id: string;
  title: string;
  problem_statement?: string;
  user_story_role?: string;
  user_story_goal?: string;
  user_story_outcome?: string;
  solution_overview?: string;
  requirements?: string;
  status: FeatureRequestStatus;
  date_raised: string;
  required_date?: string;
  design_start_date?: string;
  dev_start_date?: string;
  complete_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureRequestWithProfile extends FeatureRequest {
  creator?: {
    name?: string;
    email?: string;
  };
  product_gaps_total?: number;
  product_gaps_critical?: number;
}

export interface CreateFeatureRequestInput {
  title: string;
  problem_statement?: string;
  user_story_role?: string;
  user_story_goal?: string;
  user_story_outcome?: string;
  solution_overview?: string;
  requirements?: string;
  required_date?: string;
  design_start_date?: string;
  dev_start_date?: string;
  complete_date?: string;
  status?: FeatureRequestStatus;
}

export interface UpdateFeatureRequestInput extends CreateFeatureRequestInput {
  id: string;
}

export interface FeatureRequestFilters {
  search?: string;
  statuses?: FeatureRequestStatus[];
  mineOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export const featureRequestsService = {
  async getFeatureRequests(filters: FeatureRequestFilters = {}) {
    const { 
      search = '', 
      statuses = [], 
      mineOnly = false, 
      page = 0, 
      pageSize = 20 
    } = filters;

    let query = supabase
      .from('feature_requests')
      .select(`
        *,
        profiles!feature_requests_created_by_profiles_fkey(name)
      `)
      .order('updated_at', { ascending: false });

    // Apply search filter
    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,problem_statement.ilike.%${search}%,user_story_role.ilike.%${search}%,user_story_goal.ilike.%${search}%,user_story_outcome.ilike.%${search}%`);
    }

    // Apply status filter
    if (statuses.length > 0) {
      query = query.in('status', statuses);
    }

    // Apply mine only filter
    if (mineOnly) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq('created_by', user.id);
      }
    }

    // Apply pagination
    const offset = page * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error } = await query;

    if (error) throw error;

    // Fetch product gaps counts for all feature requests
    const featureRequestIds = (data || []).map(fr => fr.id);
    let productGapsCounts: Record<string, { total: number; critical: number }> = {};

    if (featureRequestIds.length > 0) {
      const { data: productGapsData, error: pgError } = await supabase
        .from('product_gaps')
        .select('feature_request_id, is_critical')
        .in('feature_request_id', featureRequestIds)
        .neq('status', 'Closed');

      if (!pgError && productGapsData) {
        productGapsCounts = productGapsData.reduce((acc, pg) => {
          const frId = pg.feature_request_id;
          if (!frId) return acc;
          
          if (!acc[frId]) {
            acc[frId] = { total: 0, critical: 0 };
          }
          acc[frId].total += 1;
          if (pg.is_critical) {
            acc[frId].critical += 1;
          }
          return acc;
        }, {} as Record<string, { total: number; critical: number }>);
      }
    }

    return (data || []).map(item => ({
      ...item,
      creator: {
        name: (item.profiles as any)?.name,
        email: undefined // Email not available in profiles table
      },
      product_gaps_total: productGapsCounts[item.id]?.total || 0,
      product_gaps_critical: productGapsCounts[item.id]?.critical || 0
    })) as FeatureRequestWithProfile[];
  },

  async getFeatureRequestById(id: string): Promise<FeatureRequestWithProfile | null> {
    const { data, error } = await supabase
      .from('feature_requests')
      .select(`
        *,
        profiles!feature_requests_created_by_profiles_fkey(name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      ...data,
      creator: {
        name: (data.profiles as any)?.name,
        email: undefined // Email not available in profiles table
      }
    } as FeatureRequestWithProfile;
  },

  async createFeatureRequest(input: CreateFeatureRequestInput): Promise<FeatureRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('feature_requests')
      .insert({
        ...input,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as FeatureRequest;
  },

  async updateFeatureRequest(input: UpdateFeatureRequestInput): Promise<FeatureRequest> {
    const { id, ...updateData } = input;
    
    const { data, error } = await supabase
      .from('feature_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FeatureRequest;
  },

  async deleteFeatureRequest(id: string): Promise<void> {
    const { error } = await supabase
      .from('feature_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  getStatusBadgeVariant(status: FeatureRequestStatus): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case 'Requested': return 'outline';
      case 'Rejected': return 'destructive';
      case 'In Design': return 'secondary';
      case 'In Dev': return 'default';
      case 'Complete': return 'default';
      default: return 'outline';
    }
  }
};