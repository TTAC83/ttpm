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

  const lineTable = projectType === 'solutions' ? 'solutions_lines' : 'lines' as const;
  const lineIdField = projectType === 'solutions' ? 'solutions_project_id' : 'project_id' as const;
  const projectIdField = projectType === 'solutions' ? 'solutions_line_id' : 'line_id' as const;

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
        setLines(data?.map((l: any) => ({ value: l.line_name, label: l.line_name })) || []);
      } catch (error) {
        console.error('Error loading lines:', error);
        setLines([]);
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
        const { data: lineData, error: lineError } = await (supabase as any)
          .from(lineTable)
          .select('id')
          .eq(lineIdField, projectId)
          .eq('line_name', lineName)
          .single();

        if (lineError) throw lineError;
        if (!lineData) return;

        // Query positions using the correct column name 'name'
        const { data, error } = await (supabase as any)
          .from('positions')
          .select('id, name')
          .eq(projectIdField, lineData.id)
          .order('name');

        if (error) throw error;
        setPositions(data?.map((p: any) => ({ value: p.name, label: p.name })) || []);
      } catch (error) {
        console.error('Error loading positions:', error);
        setPositions([]);
      }
    };

    loadPositions();
  }, [form.watch('line_name'), projectId, lineTable, lineIdField, projectIdField]);

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
        const { data: lineData, error: lineError } = await (supabase as any)
          .from(lineTable)
          .select('id')
          .eq(lineIdField, projectId)
          .eq('line_name', lineName)
          .single();

        if (lineError) throw lineError;
        if (!lineData) return;

        // Get position ID using the correct column name 'name'
        const { data: positionData, error: posError } = await (supabase as any)
          .from('positions')
          .select('id')
          .eq(projectIdField, lineData.id)
          .eq('name', positionName)
          .single();

        if (posError) throw posError;
        if (!positionData) return;

        // Query equipment using the correct column name 'name'
        const { data, error } = await (supabase as any)
          .from('equipment')
          .select('id, name')
          .eq('position_id', positionData.id)
          .order('name');

        if (error) throw error;
        setEquipment(data?.map((e: any) => ({ value: e.name, label: e.name })) || []);
      } catch (error) {
        console.error('Error loading equipment:', error);
        setEquipment([]);
      }
    };

    loadEquipment();
  }, [form.watch('line_name'), form.watch('position'), projectId, lineTable, lineIdField, projectIdField]);

  return {
    lines,
    positions,
    equipment,
    loading,
  };
}
