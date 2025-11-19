/**
 * Control panel for Gantt chart view options
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  ZoomIn, 
  ZoomOut, 
  Download,
  Calendar,
  ListTree,
  Maximize2
} from 'lucide-react';
import { GanttViewMode } from '../types/gantt.types';
import { ZOOM_LEVELS } from '../utils/ganttConstants';

interface GanttControlsProps {
  viewMode: GanttViewMode;
  onViewModeChange: (mode: GanttViewMode) => void;
  showWorkingDaysOnly: boolean;
  onWorkingDaysToggle: (show: boolean) => void;
  showSidebarDetails: boolean;
  onSidebarDetailsToggle: (show: boolean) => void;
  showChildTasks: boolean;
  onChildTasksToggle: (show: boolean) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExportClick: () => void;
  onFitToView?: () => void;
}

export const GanttControls: React.FC<GanttControlsProps> = ({
  viewMode,
  onViewModeChange,
  showWorkingDaysOnly,
  onWorkingDaysToggle,
  showSidebarDetails,
  onSidebarDetailsToggle,
  showChildTasks,
  onChildTasksToggle,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onExportClick,
  onFitToView,
}) => {
  const currentZoomIndex = ZOOM_LEVELS.findIndex(level => level === zoomLevel);
  const canZoomIn = currentZoomIndex >= 0 && currentZoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = currentZoomIndex > 0;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 border-b border-border bg-background">
      {/* View Mode */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">View:</Label>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'step' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('step')}
          >
            <ListTree className="h-4 w-4 mr-1" />
            Steps
          </Button>
          <Button
            variant={viewMode === 'task' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('task')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Tasks
          </Button>
        </div>
      </div>

      {/* Working Days Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="working-days"
          checked={showWorkingDaysOnly}
          onCheckedChange={onWorkingDaysToggle}
        />
        <Label htmlFor="working-days" className="text-sm cursor-pointer">
          Working Days Only
        </Label>
      </div>

      {/* Sidebar Details Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="sidebar-details"
          checked={showSidebarDetails}
          onCheckedChange={onSidebarDetailsToggle}
        />
        <Label htmlFor="sidebar-details" className="text-sm cursor-pointer">
          Show Details in Sidebar
        </Label>
      </div>

      {/* Child Tasks Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="child-tasks"
          checked={showChildTasks}
          onCheckedChange={onChildTasksToggle}
        />
        <Label htmlFor="child-tasks" className="text-sm cursor-pointer">
          Show Child Tasks
        </Label>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Zoom:</Label>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomOut}
            disabled={!canZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomIn}
            disabled={!canZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onFitToView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFitToView}
              title="Fit to View"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>

      {/* Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onExportClick}
        className="ml-auto"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  );
};
