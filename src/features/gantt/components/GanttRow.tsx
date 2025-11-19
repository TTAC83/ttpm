/**
 * Individual row component for Gantt chart
 */

import React from 'react';
import { GanttItem } from '../types/gantt.types';
import { GanttBar } from './GanttBar';
import { ROW_HEIGHT, SIDEBAR_WIDTH } from '../utils/ganttConstants';

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

  return (
    <g transform={`translate(0, ${yPosition})`} {...ariaProps}>
      {/* Sidebar - Task name */}
      <foreignObject x={0} y={0} width={SIDEBAR_WIDTH} height={ROW_HEIGHT}>
        <div
          className="flex items-center h-full px-4 border-b border-border bg-background"
          style={{
            backgroundColor: isSelected ? 'hsl(var(--accent))' : 'hsl(var(--background))',
          }}
        >
          <span
            className="text-sm truncate"
            style={{
              fontWeight: item.type === 'step' ? 600 : 400,
              paddingLeft: item.type === 'subtask' ? '2rem' : item.type === 'task' ? '1rem' : 0,
            }}
          >
            {item.name}
          </span>
        </div>
      </foreignObject>

      {/* Timeline area - Bar */}
      <g transform={`translate(${SIDEBAR_WIDTH + barX}, 0)`}>
        <GanttBar
          id={item.id}
          name={item.name}
          width={barWidth}
          status={item.status}
          plannedEnd={item.plannedEnd}
          actualEnd={item.actualEnd}
          plannedStart={item.plannedStart}
          actualStart={item.actualStart}
          stepName={item.type !== 'step' ? item.stepName : undefined}
          itemType={item.type}
          isSelected={isSelected}
          isHovered={isHovered}
          isDragging={isDragging}
          onClick={() => onItemClick?.(item)}
          onDoubleClick={() => onItemDoubleClick?.(item)}
          onDragStart={(event) => onDragStart?.(item, event)}
        />
      </g>
    </g>
  );
};
