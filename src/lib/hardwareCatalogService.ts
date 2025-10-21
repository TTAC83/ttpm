// Centralized hardware catalog accessors
// IMPORTANT: Do NOT use dedicated master tables like `cameras_master`, `plc_master`, or `lights`.
// All hardware must come from the unified `hardware_master` table.

import { supabase } from "@/integrations/supabase/client";

export interface CameraItem {
  id: string;
  manufacturer: string; // mapped from product_name
  model_number: string; // mapped from sku_no
  camera_type?: string; // mapped from description
}

export interface LightItem {
  id: string;
  manufacturer: string; // mapped from product_name
  model_number: string; // mapped from sku_no
  description?: string; // mapped from description
}

export interface PlcItem {
  id: string;
  manufacturer: string; // mapped from product_name
  model_number: string; // mapped from sku_no
  plc_type?: string; // mapped from description
}

const mapCamera = (row: any): CameraItem => ({
  id: row.id,
  manufacturer: row.product_name,
  model_number: row.sku_no,
  camera_type: row.description || undefined,
});

const mapLight = (row: any): LightItem => ({
  id: row.id,
  manufacturer: row.product_name,
  model_number: row.sku_no,
  description: row.description || undefined,
});

const mapPlc = (row: any): PlcItem => ({
  id: row.id,
  manufacturer: row.product_name,
  model_number: row.sku_no,
  plc_type: row.description || undefined,
});

export const hardwareCatalog = {
  // Returns cameras from hardware_master (hardware_type = 'Camera')
  async getCameras(): Promise<CameraItem[]> {
    const { data, error } = await supabase
      .from('hardware_master')
      .select('id, sku_no, product_name, description')
      .eq('hardware_type', 'Camera')
      .order('product_name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapCamera);
  },

  // Returns lights from hardware_master (hardware_type = 'Light')
  async getLights(): Promise<LightItem[]> {
    const { data, error } = await supabase
      .from('hardware_master')
      .select('id, sku_no, product_name, description')
      .eq('hardware_type', 'Light')
      .order('product_name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapLight);
  },

  // Returns PLCs from hardware_master (hardware_type = 'PLC')
  async getPlcs(): Promise<PlcItem[]> {
    const { data, error } = await supabase
      .from('hardware_master')
      .select('id, sku_no, product_name, description')
      .eq('hardware_type', 'PLC')
      .order('product_name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapPlc);
  },
};
