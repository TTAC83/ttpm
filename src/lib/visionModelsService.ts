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
    const { data, error } = await supabase
      .from('vision_models')
      .update(updates)
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
    try {
      // Check if line exists
      let lineId: string | undefined;
      
      if (projectType === 'solutions') {
        const { data: solutionsLines } = await supabase
          .from('solutions_lines')
          .select('id, line_name')
          .eq('solutions_project_id', projectId)
          .eq('line_name', lineName);

        if (!solutionsLines || solutionsLines.length === 0) {
          return { 
            exists: false, 
            hasCamera: false, 
            warning: `Line "${lineName}" not found in project` 
          };
        }
        lineId = solutionsLines[0].id;
      } else {
        const { data: implementationLines } = await supabase
          .from('lines')
          .select('id, line_name')
          .eq('project_id', projectId)
          .eq('line_name', lineName);

        if (!implementationLines || implementationLines.length === 0) {
          return { 
            exists: false, 
            hasCamera: false, 
            warning: `Line "${lineName}" not found in project` 
          };
        }
        lineId = implementationLines[0].id;
      }

      const { data: positions } = await supabase
        .from('positions')
        .select('id, name')
        .eq('line_id', lineId)
        .eq('name', positionName);

      if (!positions || positions.length === 0) {
        return { 
          exists: false, 
          hasCamera: false, 
          warning: `Position "${positionName}" not found in line "${lineName}"` 
        };
      }

      const positionId = positions[0].id;

      const { data: equipment } = await supabase
        .from('equipment')
        .select('id, name, cameras(id)')
        .eq('position_id', positionId)
        .eq('name', equipmentName);

      if (!equipment || equipment.length === 0) {
        return { 
          exists: false, 
          hasCamera: false, 
          warning: `Equipment "${equipmentName}" not found at position "${positionName}"` 
        };
      }

      const hasCamera = equipment[0].cameras && (equipment[0].cameras as any[]).length > 0;

      if (!hasCamera) {
        return { 
          exists: true, 
          hasCamera: false, 
          warning: `Equipment "${equipmentName}" exists but has no camera attached` 
        };
      }

      return { exists: true, hasCamera: true };
    } catch (error) {
      console.error('Verification error:', error);
      return { 
        exists: false, 
        hasCamera: false, 
        warning: 'Error verifying line configuration' 
      };
    }
  },

  async bulkUpsertVisionModels(
    models: Array<Omit<VisionModel, 'id' | 'created_at' | 'updated_at'>>,
    projectId: string,
    projectType: 'implementation' | 'solutions'
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      created: 0,
      updated: 0,
      warnings: [],
      errors: []
    };

    try {
      // Fetch existing models to check for duplicates by product_sku
      const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
      const { data: existingModels } = await supabase
        .from('vision_models')
        .select('id, product_sku')
        .eq(column, projectId);

      const existingMap = new Map(
        (existingModels || []).map(m => [m.product_sku, m.id])
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
              .update(model)
              .eq('id', existingId);

            if (error) throw error;
            result.updated++;
          } else {
            // Insert new model
            const { error } = await supabase
              .from('vision_models')
              .insert([model]);

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
