import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UseFormReturn } from 'react-hook-form';

interface CascadeOption {
  value: string;
  label: string;
}

interface UseLineEquipmentCascadeProps {
  form: UseFormReturn<any>;
  projectId: string;
  projectType: 'implementation' | 'solutions';
  open: boolean;
}

/**
 * Hook to manage cascading line -> position -> equipment dropdowns
 */
export function useLineEquipmentCascade({ form, projectId, projectType, open }: UseLineEquipmentCascadeProps) {
  const [lines, setLines] = useState<CascadeOption[]>([]);
  const [positions, setPositions] = useState<CascadeOption[]>([]);
  const [equipment, setEquipment] = useState<CascadeOption[]>([]);
  const [loading, setLoading] = useState(false);

  const lineTable = projectType === 'solutions' ? 'solutions_lines' : 'lines' as any;
  const positionTable = projectType === 'solutions' ? 'solutions_positions' : 'positions' as any;
  const equipmentTable = projectType === 'solutions' ? 'solutions_equipment' : 'equipment' as any;

  // Load lines when dialog opens
  useEffect(() => {
    if (!open || !projectId) return;

      const loadLines = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(lineTable)
          .select('id, line_name')
          .eq('project_id', projectId)
          .order('line_name');

        if (error) throw error;
        setLines(data?.map((l: any) => ({ value: l.line_name, label: l.line_name })) || []);
      } catch (error) {
        console.error('Error loading lines:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLines();
  }, [open, projectId, lineTable]);

  // Load positions when line changes
  useEffect(() => {
    const lineName = form.watch('line_name');
    if (!lineName || !projectId) {
      setPositions([]);
      return;
    }

    const loadPositions = async () => {
      try {
        // Get line ID first
        const { data: lineData } = await supabase
          .from(lineTable)
          .select('id')
          .eq('project_id', projectId)
          .eq('line_name', lineName)
          .single() as any;

        if (!lineData) return;

        const { data, error } = await supabase
          .from(positionTable)
          .select('id, position_name')
          .eq('line_id', (lineData as any).id)
          .order('position_name') as any;

        if (error) throw error;
        setPositions(data?.map((p: any) => ({ value: p.position_name, label: p.position_name })) || []);
      } catch (error) {
        console.error('Error loading positions:', error);
      }
    };

    loadPositions();
  }, [form.watch('line_name'), projectId, lineTable, positionTable]);

  // Load equipment when position changes
  useEffect(() => {
    const lineName = form.watch('line_name');
    const positionName = form.watch('position');
    
    if (!lineName || !positionName || !projectId) {
      setEquipment([]);
      return;
    }

    const loadEquipment = async () => {
      try {
        // Get line ID
        const { data: lineData } = await supabase
          .from(lineTable)
          .select('id')
          .eq('project_id', projectId)
          .eq('line_name', lineName)
          .single() as any;

        if (!lineData) return;

        // Get position ID
        const { data: positionData } = await supabase
          .from(positionTable)
          .select('id')
          .eq('line_id', (lineData as any).id)
          .eq('position_name', positionName)
          .single() as any;

        if (!positionData) return;

        const { data, error } = await supabase
          .from(equipmentTable)
          .select('id, equipment_name')
          .eq('position_id', (positionData as any).id)
          .order('equipment_name') as any;

        if (error) throw error;
        setEquipment(data?.map((e: any) => ({ value: e.equipment_name, label: e.equipment_name })) || []);
      } catch (error) {
        console.error('Error loading equipment:', error);
      }
    };

    loadEquipment();
  }, [form.watch('line_name'), form.watch('position'), projectId, lineTable, positionTable, equipmentTable]);

  return {
    lines,
    positions,
    equipment,
    loading,
  };
}
