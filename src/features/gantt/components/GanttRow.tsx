/**
 * Individual row component for Gantt chart
 */

import React from 'react';
import { GanttItem } from '../types/gantt.types';
import { GanttBar } from './GanttBar';
import { ROW_HEIGHT, SIDEBAR_WIDTH } from '../utils/ganttConstants';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface GanttRowProps {
  item: GanttItem;
  barX: number;
  barWidth: number;
  rowIndex: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  onItemClick?: (item: GanttItem) => void;
  onItemDoubleClick?: (item: GanttItem) => void;
  onDragStart?: (item: GanttItem, event: React.MouseEvent) => void;
  ariaProps?: any;
}

export const GanttRow: React.FC<GanttRowProps> = ({
  item,
  barX,
  barWidth,
  rowIndex,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  onItemClick,
  onItemDoubleClick,
  onDragStart,
  ariaProps,
}) => {
  const yPosition = rowIndex * ROW_HEIGHT;

  // Format dates
  const formatDate = (date: Date | null) => date ? format(date, 'dd/MM/yyyy') : '-';
  const dateRange = `${formatDate(item.plannedStart)} - ${formatDate(item.plannedEnd)}`;
  
  // Get step name for tasks and subtasks
  const stepInfo = item.type === 'task' || item.type === 'subtask' 
    ? (item as any).stepName 
    : null;

  // Status label mapping
  const statusLabel: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'overdue': 'Overdue',
    'blocked': 'Blocked'
  };

  // Tooltip content with full details
  const tooltipContent = (
    <div className="space-y-2 text-sm">
      <div>
        <span className="font-semibold">{item.name}</span>
      </div>
      {stepInfo && (
        <div className="text-muted-foreground">
          <span className="font-medium">Step:</span> {stepInfo}
        </div>
      )}
      <div className="text-muted-foreground">
        <span className="font-medium">Status:</span> {statusLabel[item.status]}
      </div>
      <div className="text-muted-foreground">
        <span className="font-medium">Planned:</span> {dateRange}
      </div>
      {item.actualStart && (
        <div className="text-muted-foreground">
          <span className="font-medium">Actual Start:</span> {formatDate(item.actualStart)}
        </div>
      )}
      {item.actualEnd && (
        <div className="text-muted-foreground">
          <span className="font-medium">Actual End:</span> {formatDate(item.actualEnd)}
        </div>
      )}
      {item.assigneeName && (
        <div className="text-muted-foreground">
          <span className="font-medium">Assignee:</span> {item.assigneeName}
        </div>
      )}
    </div>
  );

  return (
    <g transform={`translate(0, ${yPosition})`} {...ariaProps}>
      {/* Sidebar - Multi-line task info with tooltip */}
      <foreignObject x={0} y={0} width={SIDEBAR_WIDTH} height={ROW_HEIGHT}>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex flex-col justify-center h-full px-4 border-b border-border bg-background cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'hsl(var(--accent))' : 'hsl(var(--background))',
                  paddingLeft: item.type === 'subtask' ? '2.5rem' : item.type === 'task' ? '1.5rem' : '1rem',
                }}
              >
                {/* Task Name */}
                <div
                  className="text-sm truncate font-medium"
                  style={{
                    fontWeight: item.type === 'step' ? 600 : 500,
                  }}
                >
                  {item.name}
                </div>
                
                {/* Step | Status */}
                {stepInfo && (
                  <div className="text-xs text-muted-foreground truncate">
                    {stepInfo} | {statusLabel[item.status]}
                  </div>
                )}
                
                {/* Date Range */}
                <div className="text-xs text-muted-foreground truncate">
                  {dateRange}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </foreignObject>

      {/* Timeline area - Bar with tooltip */}
      <g transform={`translate(${SIDEBAR_WIDTH + barX}, 0)`}>
        <foreignObject x={0} y={0} width={barWidth} height={ROW_HEIGHT}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full h-full">
                  <svg width={barWidth} height={ROW_HEIGHT} style={{ overflow: 'visible' }}>
                    <GanttBar
                      id={item.id}
                      name={item.name}
                      width={barWidth}
                      status={item.status}
                      plannedEnd={item.plannedEnd}
                      actualEnd={item.actualEnd}
                      isSelected={isSelected}
                      isHovered={isHovered}
                      isDragging={isDragging}
                      onClick={() => onItemClick?.(item)}
                      onDoubleClick={() => onItemDoubleClick?.(item)}
                      onDragStart={(event) => onDragStart?.(item, event)}
                    />
                  </svg>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </foreignObject>
      </g>
    </g>
  );
};
