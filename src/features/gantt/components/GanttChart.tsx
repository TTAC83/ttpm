/**
 * Main Gantt chart orchestrator component
 */

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { GanttTimeline } from './GanttTimeline';
import { GanttControls } from './GanttControls';
import { GanttExportDialog } from './GanttExportDialog';
import { useGanttData } from '../hooks/useGanttData';
import { useGanttExport } from '../hooks/useGanttExport';
import { useGanttAccessibility } from '../hooks/useGanttAccessibility';
import { GanttItem, GanttProjectType, GanttViewMode } from '../types/gantt.types';
import { dateCalculationService } from '../services/dateCalculationService';
import { DEFAULT_ZOOM_LEVEL, ZOOM_LEVELS } from '../utils/ganttConstants';
import { AlertCircle } from 'lucide-react';

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

  // Fetch data
  const { data, isLoading, error } = useGanttData({ projectId, projectType });

  // Event handlers - defined early to avoid hoisting issues
  const handleItemClick = (item: GanttItem) => {
    setSelectedItemId(item.id);
  };

  const handleItemDoubleClick = (item: GanttItem) => {
    // TODO: Open edit dialog
    console.log('Double clicked:', item);
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

  // Calculate day width based on zoom level
  const dayWidth = useMemo(() => {
    return (zoomLevel / 100) * 20; // Base width of 20px at 100% zoom
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
            selectedItemId={selectedItemId}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
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
    </>
  );
};
