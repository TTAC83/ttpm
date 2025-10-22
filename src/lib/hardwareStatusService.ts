import { supabase } from '@/integrations/supabase/client';

export type HardwareStage = 'ordered' | 'configured' | 'bench_tested' | 'shipped' | 'installed' | 'validated';
export type HardwareStatusType = 'open' | 'overdue' | 'complete';

export interface HardwareStatusRecord {
  id: string;
  project_id: string;
  hardware_reference: string;
  hardware_type: string;
  line_name?: string;
  equipment_name?: string;
  sku_model?: string;
  stage: HardwareStage;
  status: HardwareStatusType;
  start_date?: string;
  complete_date?: string;
  notes?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export const fetchHardwareStatuses = async (projectId: string) => {
  const { data, error } = await supabase
    .from('hardware_status_tracking')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data as HardwareStatusRecord[];
};

export const upsertHardwareStatus = async (
  projectId: string,
  hardwareReference: string,
  stage: HardwareStage,
  statusData: {
    status: HardwareStatusType;
    start_date?: string;
    complete_date?: string;
    notes?: string;
    hardware_type: string;
    line_name?: string;
    equipment_name?: string;
    sku_model?: string;
  }
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('hardware_status_tracking')
    .upsert({
      project_id: projectId,
      hardware_reference: hardwareReference,
      stage,
      ...statusData,
      created_by: user.id,
      updated_by: user.id,
    }, {
      onConflict: 'project_id,hardware_reference,stage'
    })
    .select()
    .single();

  if (error) throw error;
  return data as HardwareStatusRecord;
};
