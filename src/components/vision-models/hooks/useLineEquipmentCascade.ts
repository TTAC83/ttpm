import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UseFormReturn } from 'react-hook-form';

export interface CascadeOption {
  value: string;  // The ID (UUID) for FK
  label: string;  // Display name
  name: string;   // The actual name value
}

export interface CameraOption {
  value: string;  // camera ID
  label: string;  // camera name/mac_address
  equipmentId: string;
}

interface UseLineEquipmentCascadeProps {
  form: UseFormReturn<any>;
  projectId: string;
  projectType: 'implementation' | 'solutions';
  open: boolean;
}

/**
 * Hook to manage cascading line -> position -> equipment -> camera dropdowns
 * Now returns both IDs (for FK) and names (for display/legacy)
 */
export function useLineEquipmentCascade({ form, projectId, projectType, open }: UseLineEquipmentCascadeProps) {
  const [lines, setLines] = useState<CascadeOption[]>([]);
  const [positions, setPositions] = useState<CascadeOption[]>([]);
  const [equipment, setEquipment] = useState<CascadeOption[]>([]);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [loading, setLoading] = useState(false);

  const lineTable = projectType === 'solutions' ? 'solutions_lines' : 'lines' as const;
  const lineIdField = projectType === 'solutions' ? 'solutions_project_id' : 'project_id' as const;
  const positionLineField = projectType === 'solutions' ? 'solutions_line_id' : 'line_id' as const;

  // Load lines when dialog opens
  useEffect(() => {
    if (!open || !projectId) return;

    const loadLines = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from(lineTable)
          .select('id, line_name')
          .eq(lineIdField, projectId)
          .order('line_name');

        if (error) throw error;
        setLines(data?.map((l: any) => ({ 
          value: l.id,        // UUID for FK
          label: l.line_name, // Display
          name: l.line_name   // For legacy text field
        })) || []);
      } catch (error) {
        console.error('Error loading lines:', error);
        setLines([]);
      } finally {
        setLoading(false);
      }
    };

    loadLines();
  }, [open, projectId, lineTable, lineIdField]);

  // Load positions when line changes
  useEffect(() => {
    const lineId = projectType === 'solutions' 
      ? form.watch('solutions_line_id') 
      : form.watch('line_id');
    
    if (!lineId || !projectId) {
      setPositions([]);
      return;
    }

    const loadPositions = async () => {
      try {
        const { data, error } = await supabase
          .from('positions')
          .select('id, name')
          .eq(positionLineField, lineId)
          .order('name');

        if (error) throw error;
        setPositions(data?.map((p: any) => ({ 
          value: p.id,    // UUID for FK
          label: p.name,  // Display
          name: p.name    // For legacy text field
        })) || []);
      } catch (error) {
        console.error('Error loading positions:', error);
        setPositions([]);
      }
    };

    loadPositions();
  }, [form.watch('line_id'), form.watch('solutions_line_id'), projectId, positionLineField, projectType]);

  // Load equipment when position changes
  useEffect(() => {
    const positionId = form.watch('position_id');
    
    if (!positionId || !projectId) {
      setEquipment([]);
      setCameras([]);
      return;
    }

    const loadEquipment = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('id, name')
          .eq('position_id', positionId)
          .order('name');

        if (error) throw error;
        setEquipment(data?.map((e: any) => ({ 
          value: e.id,    // UUID for FK
          label: e.name,  // Display
          name: e.name    // For legacy text field
        })) || []);
      } catch (error) {
        console.error('Error loading equipment:', error);
        setEquipment([]);
      }
    };

    loadEquipment();
  }, [form.watch('position_id'), projectId]);

  // Load cameras when equipment changes
  useEffect(() => {
    const equipmentId = form.watch('equipment_id');
    
    if (!equipmentId) {
      setCameras([]);
      return;
    }

    const loadCameras = async () => {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('id, mac_address, equipment_id')
          .eq('equipment_id', equipmentId)
          .order('mac_address');

        if (error) throw error;
        setCameras(data?.map((c: any) => ({ 
          value: c.id,
          label: c.mac_address || 'Unnamed Camera',
          equipmentId: c.equipment_id
        })) || []);
      } catch (error) {
        console.error('Error loading cameras:', error);
        setCameras([]);
      }
    };

    loadCameras();
  }, [form.watch('equipment_id')]);

  return {
    lines,
    positions,
    equipment,
    cameras,
    loading,
  };
}