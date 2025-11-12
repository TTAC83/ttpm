/**
 * Main Gantt chart orchestrator component
 */

import React, { useState, useMemo } from 'react';
import { GanttTimeline } from './GanttTimeline';
import { useGanttData } from '../hooks/useGanttData';
import { GanttProjectType, GanttViewMode, GanttItem } from '../types/gantt.types';
import { dateCalculationService } from '../services/dateCalculationService';
import { DEFAULT_DAY_WIDTH, DEFAULT_ZOOM_LEVEL } from '../utils/ganttConstants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface GanttChartProps {
  projectId: string;
  projectType: GanttProjectType;
}

export const GanttChart: React.FC<GanttChartProps> = ({ projectId, projectType }) => {
  const [viewMode, setViewMode] = useState<GanttViewMode>('task');
  const [showWorkingDaysOnly, setShowWorkingDaysOnly] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  // Fetch data
  const { data, isLoading, error } = useGanttData({ projectId, projectType });

  // Calculate day width based on zoom
  const dayWidth = DEFAULT_DAY_WIDTH * zoomLevel;

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

  const handleItemClick = (item: GanttItem) => {
    setSelectedItemId(item.id);
  };

  const handleItemDoubleClick = (item: GanttItem) => {
    console.log('Double clicked item:', item);
    // TODO: Open edit dialog
  };

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{data.projectName}</CardTitle>
        <CardDescription>{data.customerName}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* TODO: Add GanttControls component here */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('step')}
            className={`px-4 py-2 rounded ${viewMode === 'step' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Steps
          </button>
          <button
            onClick={() => setViewMode('task')}
            className={`px-4 py-2 rounded ${viewMode === 'task' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setShowWorkingDaysOnly(!showWorkingDaysOnly)}
            className={`px-4 py-2 rounded ${showWorkingDaysOnly ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            Working Days Only
          </button>
        </div>

        <div style={{ height: '600px' }}>
          <GanttTimeline
            items={allItems}
            viewMode={viewMode}
            showWorkingDaysOnly={showWorkingDaysOnly}
            dayWidth={dayWidth}
            timelineStart={timelineBounds.start}
            timelineEnd={timelineBounds.end}
            dateMarkers={dateMarkers}
            selectedItemId={selectedItemId}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
          />
        </div>
      </CardContent>
    </Card>
  );
};
