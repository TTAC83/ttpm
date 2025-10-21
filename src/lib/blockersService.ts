import { supabase } from "@/integrations/supabase/client";

export interface ImplementationBlocker {
  id: string;
  project_id?: string;
  solutions_project_id?: string;
  project_type?: 'implementation' | 'solutions';
  title: string;
  description?: string;
  status: 'Live' | 'Closed';
  raised_at: string;
  estimated_complete_date?: string;
  owner: string;
  created_by: string;
  closed_at?: string;
  resolution_notes?: string;
  updated_at: string;
  reason_code?: string;
  is_critical?: boolean;
  // For view with joins
  project_name?: string;
  customer_name?: string;
  age_days?: number;
  is_overdue?: boolean;
  owner_name?: string;
}

export interface BlockerUpdate {
  id: string;
  blocker_id: string;
  note: string;
  created_by: string;
  created_at: string;
  author_name?: string;
}

export interface BlockerAttachment {
  id: string;
  blocker_id: string;
  file_path: string;
  file_name: string;
  mime_type?: string;
  size_bytes?: number;
  uploaded_by: string;
  uploaded_at: string;
}

export const blockersService = {
  // Get blockers for a project
  async getProjectBlockers(
    projectId: string, 
    status?: 'Live' | 'Closed' | 'All',
    projectType: 'implementation' | 'solutions' = 'implementation'
  ) {
    const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
    
    let query = supabase
      .from('implementation_blockers')
      .select('*')
      .eq(column, projectId)
      .order('raised_at', { ascending: false });

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get profile names separately to avoid foreign key issues
    if (data && data.length > 0) {
      const userIds = [...new Set([...data.map(b => b.owner), ...data.map(b => b.created_by)])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      
      return data?.map(blocker => ({
        ...blocker,
        owner_name: profileMap.get(blocker.owner) || 'Unknown',
        age_days: Math.floor((new Date().getTime() - new Date(blocker.raised_at).getTime()) / (1000 * 60 * 60 * 24)),
        is_overdue: blocker.estimated_complete_date && new Date() > new Date(blocker.estimated_complete_date)
      })) || [];
    }
    
    return [];
  },

  // Get open blockers for dashboard
  async getDashboardBlockers() {
    const { data, error } = await supabase
      .from('v_impl_open_blockers')
      .select('*')
      .order('raised_at', { ascending: false });

    if (error) throw error;
    
    // Calculate is_overdue client-side and sort
    const result = (data || []).map(blocker => ({
      ...blocker,
      is_overdue: blocker.estimated_complete_date && new Date() > new Date(blocker.estimated_complete_date)
    }));
    
    // Sort by overdue first, then by raised_at
    result.sort((a, b) => {
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      return new Date(b.raised_at).getTime() - new Date(a.raised_at).getTime();
    });
    
    return result;
  },

  // Get all blockers with filters
  async getAllBlockers(filters?: {
    customer?: string;
    project?: string;
    status?: 'Live' | 'Closed' | 'All';
    overdue?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) {
    let query = supabase
      .from('implementation_blockers')
      .select('*')
      .order('raised_at', { ascending: false });

    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('raised_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('raised_at', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get related data separately to avoid foreign key issues
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(b => b.owner))];
      const projectIds = [...new Set(data.map(b => b.project_id))];
      
      const [profiles, projects] = await Promise.all([
        supabase.from('profiles').select('user_id, name').in('user_id', userIds),
        supabase.from('projects').select('id, name, company:companies(name)').in('id', projectIds)
      ]);
      
      const profileMap = new Map(profiles.data?.map(p => [p.user_id, p.name]) || []);
      const projectMap = new Map(projects.data?.map(p => [p.id, { name: p.name, company: p.company }]) || []);
      
      let result = data?.map(blocker => {
        const project = projectMap.get(blocker.project_id);
        return {
          ...blocker,
          project_name: project?.name,
          customer_name: project?.company?.name,
          owner_name: profileMap.get(blocker.owner) || 'Unknown',
          age_days: Math.floor((new Date().getTime() - new Date(blocker.raised_at).getTime()) / (1000 * 60 * 60 * 24)),
          is_overdue: blocker.estimated_complete_date && new Date() > new Date(blocker.estimated_complete_date)
        };
      }) || [];

      // Apply client-side filters
      if (filters?.customer) {
        result = result.filter(b => b.customer_name?.toLowerCase().includes(filters.customer!.toLowerCase()));
      }
      if (filters?.project) {
        result = result.filter(b => b.project_name?.toLowerCase().includes(filters.project!.toLowerCase()));
      }
      if (filters?.overdue) {
        result = result.filter(b => b.is_overdue);
      }

      return result;
    }
    
    return [];
  },

  // Create blocker
  async createBlocker(blocker: {
    project_id?: string;
    solutions_project_id?: string;
    project_type: 'implementation' | 'solutions';
    title: string;
    description?: string;
    owner: string;
    estimated_complete_date?: string;
    reason_code?: string;
    is_critical?: boolean;
  }) {
    const { data, error } = await supabase
      .from('implementation_blockers')
      .insert([{
        ...blocker,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update blocker
  async updateBlocker(id: string, updates: Partial<ImplementationBlocker>) {
    const { data, error } = await supabase
      .from('implementation_blockers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Close blocker
  async closeBlocker(id: string, resolutionNotes: string) {
    const { data, error } = await supabase
      .from('implementation_blockers')
      .update({
        status: 'Closed',
        resolution_notes: resolutionNotes,
        closed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get blocker updates
  async getBlockerUpdates(blockerId: string) {
    const { data, error } = await supabase
      .from('implementation_blocker_updates')
      .select('*')
      .eq('blocker_id', blockerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Get profile names separately
    if (data && data.length > 0) {
      const userIds = data.map(update => update.created_by);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      
      return data.map(update => ({
        ...update,
        author_name: profileMap.get(update.created_by) || 'Unknown'
      }));
    }
    
    return [];
  },

  // Add blocker update
  async addBlockerUpdate(blockerId: string, note: string) {
    const { data, error } = await supabase
      .from('implementation_blocker_updates')
      .insert([{
        blocker_id: blockerId,
        note,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get blocker attachments
  async getBlockerAttachments(blockerId: string) {
    const { data, error } = await supabase
      .from('implementation_blocker_attachments')
      .select('*')
      .eq('blocker_id', blockerId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Upload attachment
  async uploadAttachment(blockerId: string, file: File) {
    const filePath = `blockers/${blockerId}/${file.name}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Record in database
    const { data, error } = await supabase
      .from('implementation_blocker_attachments')
      .insert([{
        blocker_id: blockerId,
        file_path: filePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Download attachment
  async downloadAttachment(filePath: string) {
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(filePath);

    if (error) throw error;
    return data;
  },

  // Delete attachment
  async deleteAttachment(id: string, filePath: string) {
    // Delete from storage
    await supabase.storage
      .from('attachments')
      .remove([filePath]);

    // Delete from database
    const { error } = await supabase
      .from('implementation_blocker_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get internal users for owner selection
  async getInternalUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name')
      .eq('is_internal', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }
};