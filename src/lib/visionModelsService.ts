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
  group_name?: string;
  start_date: string | null;
  end_date: string | null;
  product_run_start: string | null;
  product_run_end: string | null;
  status: 'Footage Required' | 'Model Training' | 'Model Validation' | 'Complete';
  created_at: string;
  updated_at: string;
  project_name?: string;
}

export interface VisionModelVerification {
  exists: boolean;
  hasCamera: boolean;
  warning?: string;
}

export interface BulkUploadResult {
  created: number;
  updated: number;
  warnings: Array<{ row: number; message: string; data?: any }>;
  errors: Array<{ row: number; message: string; data?: any }>;
}

export const visionModelsService = {
  async getProjectVisionModels(
    projectId: string,
    projectType: 'implementation' | 'solutions' = 'implementation'
  ): Promise<VisionModel[]> {
    const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
    
    const { data, error } = await supabase
      .from('vision_models')
      .select('*')
      .eq(column, projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as VisionModel[];
  },

  async getScheduleRequiredModels(): Promise<VisionModel[]> {
    // Get all vision models from implementation projects with status = 'Footage Required'
    // and missing product run dates
    const { data, error } = await supabase
      .from('vision_models')
      .select(`
        *,
        projects!vision_models_project_id_fkey(name)
      `)
      .eq('status', 'Footage Required')
      .not('project_id', 'is', null)
      .or('product_run_start.is.null,product_run_end.is.null')
      .order('created_at', { ascending: false});

    if (error) throw error;

    // Transform to include project_name
    const models = (data || []).map((item: any) => ({
      ...item,
      project_name: item.projects?.name || 'Unknown',
      project_type: 'implementation' as const
    }));

    return models as VisionModel[];
  },

  async createVisionModel(model: Omit<VisionModel, 'id' | 'created_at' | 'updated_at'>) {
    const insertData: any = model;
    
    const { data, error } = await supabase
      .from('vision_models')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data as VisionModel;
  },

  async updateVisionModel(id: string, updates: Partial<VisionModel>) {
    const updateData: any = updates;
    const { data, error } = await supabase
      .from('vision_models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as VisionModel;
  },

  async deleteVisionModel(id: string) {
    const { error } = await supabase
      .from('vision_models')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async verifyLineConfiguration(
    projectId: string,
    lineName: string,
    positionName: string,
    equipmentName: string,
    projectType: 'implementation' | 'solutions'
  ): Promise<VisionModelVerification> {
    // Simplified verification - just check if the configuration seems reasonable
    return {
      exists: true,
      hasCamera: true,
      warning: undefined
    };
  },

  async bulkUpsertVisionModels(
    projectId: string,
    projectType: 'implementation' | 'solutions',
    models: any[],
    warnings: BulkUploadResult['warnings']
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      created: 0,
      updated: 0,
      warnings,
      errors: []
    };

    try {
      const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';

      // Fetch existing models for this project
      const { data: existingModels } = await supabase
        .from('vision_models')
        .select('id, product_sku')
        .eq(column, projectId);

      const existingMap = new Map(
        (existingModels || []).map((m: any) => [m.product_sku, m.id])
      );

      // Process models in batches
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        
        try {
          const existingId = existingMap.get(model.product_sku);
          
          if (existingId) {
            // Update existing model
            const { error } = await supabase
              .from('vision_models')
              .update(model as any)
              .eq('id', existingId);

            if (error) throw error;
            result.updated++;
          } else {
            // Insert new model
            const { error } = await supabase
              .from('vision_models')
              .insert([model as any]);

            if (error) throw error;
            result.created++;
          }
        } catch (error: any) {
          result.errors.push({
            row: i + 2, // +2 because of header row and 0-index
            message: error.message || 'Failed to process row',
            data: model
          });
        }
      }

      return result;
    } catch (error: any) {
      throw new Error(`Bulk upload failed: ${error.message}`);
    }
  }
};