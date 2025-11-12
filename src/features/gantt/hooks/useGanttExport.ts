/**
 * Hook for orchestrating Gantt chart exports
 */

import { useState, useCallback, useRef } from 'react';
import { ganttExportService } from '../services/ganttExportService';
import { GanttExportFormat, GanttItem, GanttEvent } from '../types/gantt.types';
import { useToast } from '@/hooks/use-toast';

interface UseGanttExportOptions {
  projectName: string;
  customerName: string;
  items: GanttItem[];
  events?: GanttEvent[];
}

export const useGanttExport = (options: UseGanttExportOptions) => {
  const [isExporting, setIsExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { toast } = useToast();

  /**
   * Set the SVG element reference for export
   */
  const setSvgRef = useCallback((element: SVGSVGElement | null) => {
    svgRef.current = element;
  }, []);

  /**
   * Execute export in specified format
   */
  const executeExport = useCallback(
    async (format: GanttExportFormat) => {
      if (isExporting) return;

      setIsExporting(true);

      try {
        // Show loading toast
        toast({
          title: 'Exporting...',
          description: `Preparing ${format.toUpperCase()} export`,
        });

        await ganttExportService.export({
          ...options,
          format,
          svgElement: svgRef.current || undefined,
        });

        // Show success toast
        toast({
          title: 'Export Complete',
          description: `Gantt chart exported as ${format.toUpperCase()}`,
        });
      } catch (error) {
        console.error('Export failed:', error);
        toast({
          title: 'Export Failed',
          description: error instanceof Error ? error.message : 'An error occurred during export',
          variant: 'destructive',
        });
      } finally {
        setIsExporting(false);
      }
    },
    [options, isExporting, toast]
  );

  return {
    isExporting,
    executeExport,
    setSvgRef,
  };
};
