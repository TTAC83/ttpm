import { supabase } from "@/integrations/supabase/client";

export interface VisionModel {
  id: string;
  project_id?: string;
  solutions_project_id?: string;
  project_type?: 'implementation' | 'solutions';
  line_name: string;
  position: string;
  equipment: string;
  product_sku: string;
  product_title: string;
  use_case: string;
  start_date: string | null;
  end_date: string | null;
  product_run_start: string | null;
  product_run_end: string | null;
  status: 'Footage Required' | 'Model Training' | 'Model Validation' | 'Complete';
  created_at: string;
  updated_at: string;
}

export const visionModelsService = {
  async getProjectModels(
    projectId: string,
    projectType: 'implementation' | 'solutions' = 'implementation'
  ): Promise<VisionModel[]> {
    const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
    
    const { data, error } = await supabase
      .from('vision_models')
      .select('*')
      .eq(column, projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[VisionModels] Fetch error:', error);
      throw error;
    }

    return data || [];
  },

  async createModel(model: Omit<VisionModel, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('vision_models')
      .insert(model)
      .select()
      .single();

    if (error) {
      console.error('[VisionModels] Create error:', error);
      throw error;
    }

    return data;
  },

  async updateModel(modelId: string, updates: Partial<VisionModel>) {
    const { data, error } = await supabase
      .from('vision_models')
      .update(updates)
      .eq('id', modelId)
      .select()
      .single();

    if (error) {
      console.error('[VisionModels] Update error:', error);
      throw error;
    }

    return data;
  },

  async deleteModel(modelId: string) {
    const { error } = await supabase
      .from('vision_models')
      .delete()
      .eq('id', modelId);

    if (error) {
      console.error('[VisionModels] Delete error:', error);
      throw error;
    }
  },
};
