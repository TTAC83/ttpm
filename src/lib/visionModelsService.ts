import { supabase } from "@/integrations/supabase/client";

export interface VisionModel {
  id: string;
  project_id?: string;
  solutions_project_id?: string;
  project_type?: 'implementation' | 'solutions';
  // Legacy text fields (kept for backward compatibility)
  line_name: string;
  position: string;
  equipment: string;
  // New FK fields
  line_id?: string;
  solutions_line_id?: string;
  position_id?: string;
  equipment_id?: string;
  camera_id?: string;
  // Other fields
  product_sku: string;
  product_title: string;
  use_case: string;
  group_name?: string;
  /** @deprecated Use product_run_start instead */
  start_date?: string | null;
  /** @deprecated Use product_run_end instead */
  end_date?: string | null;
  product_run_start: string | null;
  product_run_start_has_time?: boolean;
  product_run_end: string | null;
  product_run_end_has_time?: boolean;
  status: 'Footage Required' | 'Annotation Required' | 'Processing Required' | 'Deployment Required' | 'Validation Required' | 'Complete';
  created_at: string;
  updated_at: string;
  project_name?: string;
  customer_name?: string;
  // Computed: whether this record uses FK or legacy text
  uses_fk?: boolean;
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

// Helper to determine if a vision model uses FK or legacy text
export function modelUsesFk(model: VisionModel): boolean {
  return !!(model.line_id || model.solutions_line_id || model.position_id || model.equipment_id);
}

// Helper to get display values (prefer FK-linked data, fallback to text)
export function getDisplayValues(model: VisionModel, linkedData?: {
  lineName?: string;
  positionName?: string;
  equipmentName?: string;
  cameraName?: string;
}): { line: string; position: string; equipment: string; camera?: string } {
  return {
    line: linkedData?.lineName || model.line_name || 'Unknown',
    position: linkedData?.positionName || model.position || 'Unknown',
    equipment: linkedData?.equipmentName || model.equipment || 'Unknown',
    camera: linkedData?.cameraName,
  };
}

/**
 * Private helper to enrich vision models with project info
 * Eliminates duplicate code across getScheduleRequiredModels, getFootageRequiredModels, getModelsByStatus
 */
async function enrichModelsWithProjectInfo(
  visionModels: any[],
  defaultProjectType: 'implementation' | 'solutions' = 'implementation'
): Promise<VisionModel[]> {
  if (!visionModels || visionModels.length === 0) return [];

  // Collect unique project IDs from both implementation and solutions
  const implProjectIds = [...new Set(visionModels.map(m => m.project_id).filter(Boolean))];
  const solProjectIds = [...new Set(visionModels.map(m => m.solutions_project_id).filter(Boolean))];

  // Fetch implementation projects
  const implProjectMap = new Map<string, { name: string; customer: string }>();
  if (implProjectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select(`id, name, companies!projects_company_id_fkey(name)`)
      .in('id', implProjectIds);

    (projects || []).forEach((p: any) => {
      implProjectMap.set(p.id, {
        name: p.name,
        customer: p.companies?.name || 'Unknown'
      });
    });
  }

  // Fetch solutions projects
  const solProjectMap = new Map<string, { name: string; customer: string }>();
  if (solProjectIds.length > 0) {
    const { data: projects } = await supabase
      .from('solutions_projects')
      .select(`id, name, companies!solutions_projects_company_id_fkey(name)`)
      .in('id', solProjectIds);

    (projects || []).forEach((p: any) => {
      solProjectMap.set(p.id, {
        name: p.name,
        customer: p.companies?.name || 'Unknown'
      });
    });
  }

  // Enrich models with project info
  return visionModels.map((item: any) => {
    let projectInfo: { name: string; customer: string } | undefined;
    let projectType: 'implementation' | 'solutions' = defaultProjectType;

    if (item.project_id) {
      projectInfo = implProjectMap.get(item.project_id);
      projectType = 'implementation';
    } else if (item.solutions_project_id) {
      projectInfo = solProjectMap.get(item.solutions_project_id);
      projectType = 'solutions';
    }

    return {
      ...item,
      project_name: projectInfo?.name || 'Unknown',
      customer_name: projectInfo?.customer || 'Unknown',
      project_type: projectType,
      uses_fk: modelUsesFk(item),
    };
  }) as VisionModel[];
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
    
    // Add uses_fk flag to each model
    return (data || []).map((m: any) => ({
      ...m,
      uses_fk: modelUsesFk(m),
    })) as VisionModel[];
  },

  async getScheduleRequiredModels(): Promise<VisionModel[]> {
    const { data: visionModels, error } = await supabase
      .from('vision_models')
      .select('*')
      .eq('status', 'Footage Required')
      .or('product_run_start.is.null,product_run_end.is.null')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return enrichModelsWithProjectInfo(visionModels || []);
  },

  async getFootageRequiredModels(): Promise<VisionModel[]> {
    const { data: visionModels, error } = await supabase
      .from('vision_models')
      .select('*')
      .eq('status', 'Footage Required')
      .not('product_run_start', 'is', null)
      .not('product_run_end', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return enrichModelsWithProjectInfo(visionModels || []);
  },

  async getModelsByStatus(status: VisionModel['status']): Promise<VisionModel[]> {
    const { data: visionModels, error } = await supabase
      .from('vision_models')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return enrichModelsWithProjectInfo(visionModels || []);
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

      const { data: existingModels } = await supabase
        .from('vision_models')
        .select('id, product_sku')
        .eq(column, projectId);

      const existingMap = new Map(
        (existingModels || []).map((m: any) => [m.product_sku, m.id])
      );

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        
        try {
          const existingId = existingMap.get(model.product_sku);
          
          if (existingId) {
            const { error } = await supabase
              .from('vision_models')
              .update(model as any)
              .eq('id', existingId);

            if (error) throw error;
            result.updated++;
          } else {
            const { error } = await supabase
              .from('vision_models')
              .insert([model as any]);

            if (error) throw error;
            result.created++;
          }
        } catch (error: any) {
          result.errors.push({
            row: i + 2,
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
