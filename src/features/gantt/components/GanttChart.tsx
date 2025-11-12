/**
 * Main Gantt chart orchestrator component
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { GanttTimeline } from './GanttTimeline';
import { GanttControls } from './GanttControls';
import { GanttExportDialog } from './GanttExportDialog';
import { GanttTaskDialog } from './GanttTaskDialog';
import { useGanttData } from '../hooks/useGanttData';
import { useGanttExport } from '../hooks/useGanttExport';
import { useGanttAccessibility } from '../hooks/useGanttAccessibility';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { GanttItem, GanttProjectType, GanttViewMode } from '../types/gantt.types';
import { dateCalculationService } from '../services/dateCalculationService';
import { DEFAULT_ZOOM_LEVEL, DEFAULT_DAY_WIDTH, ZOOM_LEVELS } from '../utils/ganttConstants';
import { AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GanttChartProps {
  projectId: string;
  projectType: GanttProjectType;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId, projectType }) => {
  const [viewMode, setViewMode] = useState<GanttViewMode>('step');
  const [showWorkingDaysOnly, setShowWorkingDaysOnly] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<typeof ZOOM_LEVELS[number]>(DEFAULT_ZOOM_LEVEL);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GanttItem | null>(null);
  const [showDependencies, setShowDependencies] = useState(true);

  // Fetch data
  const { data, isLoading, error } = useGanttData({ projectId, projectType });

  // Event handlers - defined early to avoid hoisting issues
  const handleItemClick = (item: GanttItem) => {
    setSelectedItemId(item.id);
  };

  const handleItemDoubleClick = (item: GanttItem) => {
    setEditingItem(item);
    setTaskDialogOpen(true);
  };

  const handleItemUpdate = async (itemId: string, newDates: { plannedStart: Date; plannedEnd: Date }) => {
    try {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      let updates: any = {
        planned_start_date: newDates.plannedStart.toISOString().split('T')[0],
        planned_end_date: newDates.plannedEnd.toISOString().split('T')[0],
      };

      if (item.type === 'task') {
        const { error } = await supabase
          .from('project_tasks' as any)
          .update(updates)
          .eq('id', itemId);

        if (error) throw error;
      } else if (item.type === 'subtask') {
        const { error } = await supabase
          .from('project_subtasks' as any)
          .update(updates)
          .eq('id', itemId);

        if (error) throw error;
      } else {
        return; // Can't update steps via drag
      }

      toast({
        title: 'Task updated',
        description: 'The task dates have been successfully updated.',
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update task dates. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleTaskSave = async (itemId: string, updates: Partial<GanttItem>) => {
    try {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      let dbUpdates: any = {};

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.plannedStart !== undefined) {
        dbUpdates.planned_start_date = updates.plannedStart?.toISOString().split('T')[0] || null;
      }
      if (updates.plannedEnd !== undefined) {
        dbUpdates.planned_end_date = updates.plannedEnd?.toISOString().split('T')[0] || null;
      }
      if (updates.actualStart !== undefined) {
        dbUpdates.actual_start_date = updates.actualStart?.toISOString().split('T')[0] || null;
      }
      if (updates.actualEnd !== undefined) {
        dbUpdates.actual_end_date = updates.actualEnd?.toISOString().split('T')[0] || null;
      }
      if (updates.assigneeId !== undefined) {
        dbUpdates.assigned_to = updates.assigneeId || null;
      }

      if (item.type === 'task') {
        const { error } = await supabase
          .from('project_tasks' as any)
          .update(dbUpdates)
          .eq('id', itemId);

        if (error) throw error;
      } else if (item.type === 'subtask') {
        const { error } = await supabase
          .from('project_subtasks' as any)
          .update(dbUpdates)
          .eq('id', itemId);

        if (error) throw error;
      } else {
        return;
      }

      toast({
        title: 'Task saved',
        description: 'The task has been successfully updated.',
      });
    } catch (error) {
      console.error('Failed to save task:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save task changes. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex >= 0 && currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  // Export functionality
  const { isExporting, executeExport, setSvgRef } = useGanttExport({
    projectName: data?.projectName || 'Project',
    customerName: data?.customerName || 'Customer',
    items: data?.steps || [],
    events: data?.events,
  });

  // Accessibility
  const { getContainerProps, getItemProps } = useGanttAccessibility({
    items: data?.steps || [],
    selectedItemId,
    onItemSelect: setSelectedItemId,
    onItemActivate: handleItemDoubleClick,
  });

  // Flatten items for rendering
  const allItems = useMemo((): GanttItem[] => {
    if (!data) return [];

    const items: GanttItem[] = [];

    if (viewMode === 'step') {
      // Show steps only
      return data.steps;
    } else {
      // Show tasks and subtasks
      data.steps.forEach(step => {
        step.tasks.forEach(task => {
          items.push(task);
          // Add subtasks if task is expanded
          if (task.subtasks && !task.isCollapsed) {
            items.push(...task.subtasks);
          }
        });
      });
      return items;
    }
  }, [data, viewMode]);

  // Calculate day width based on zoom level (multiplier: 0.5x to 2x)
  const dayWidth = useMemo(() => {
    return zoomLevel * DEFAULT_DAY_WIDTH; // e.g., 1 * 30 = 30px
  }, [zoomLevel]);

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (!data) return null;
    
    const allItems = [...data.steps, ...data.tasks, ...data.subtasks];
    return dateCalculationService.calculateTimelineBounds(allItems, data.events);
  }, [data]);

  // Generate date markers
  const dateMarkers = useMemo(() => {
    if (!timelineBounds) return [];
    
    return dateCalculationService.generateDateMarkers(
      timelineBounds.start,
      timelineBounds.end,
      showWorkingDaysOnly,
      dayWidth
    );
  }, [timelineBounds, showWorkingDaysOnly, dayWidth]);

  // Drag and drop
  const {
    isDragging,
    draggedItemId,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useDragAndDrop({
    items: allItems,
    timelineStart: timelineBounds?.start || new Date(),
    showWorkingDaysOnly,
    dayWidth,
    onItemUpdate: handleItemUpdate,
  });

  // Set up drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load Gantt chart data: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || !timelineBounds) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No project data available to display Gantt chart.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card className="overflow-hidden" {...getContainerProps()}>
        {/* Controls */}
        <GanttControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showWorkingDaysOnly={showWorkingDaysOnly}
          onWorkingDaysToggle={setShowWorkingDaysOnly}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onExportClick={() => setExportDialogOpen(true)}
        />

        {/* Timeline */}
        {timelineBounds && (
          <GanttTimeline
            items={allItems}
            viewMode={viewMode}
            dayWidth={dayWidth}
            timelineStart={timelineBounds.start}
            timelineEnd={timelineBounds.end}
            dateMarkers={dateMarkers}
            showWorkingDaysOnly={showWorkingDaysOnly}
            showDependencies={showDependencies}
            selectedItemId={selectedItemId}
            draggedItemId={draggedItemId}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onDragStart={handleDragStart}
            setSvgRef={setSvgRef}
            getItemProps={getItemProps}
          />
        )}
      </Card>

      {/* Export Dialog */}
      <GanttExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={executeExport}
        isExporting={isExporting}
      />

      {/* Task Edit Dialog */}
      <GanttTaskDialog
        item={editingItem}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleTaskSave}
      />
    </>
  );
};
