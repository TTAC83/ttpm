/**
 * Component for rendering dependency arrows between Gantt tasks
 */

import React, { useMemo } from 'react';
import { GanttItem } from '../types/gantt.types';
import { dateCalculationService } from '../services/dateCalculationService';
import { SIDEBAR_WIDTH, ROW_HEIGHT } from '../utils/ganttConstants';

interface GanttDependencyLinesProps {
  items: GanttItem[];
  timelineStart: Date;
  showWorkingDaysOnly: boolean;
  dayWidth: number;
}

interface DependencyLine {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  path: string;
}

export const GanttDependencyLines: React.FC<GanttDependencyLinesProps> = ({
  items,
  timelineStart,
  showWorkingDaysOnly,
  dayWidth,
}) => {
  const dependencyLines = useMemo((): DependencyLine[] => {
    const lines: DependencyLine[] = [];
    const itemMap = new Map(items.map(item => [item.id, item]));

    items.forEach((item, index) => {
      if (item.type !== 'task' || !item.dependencies || item.dependencies.length === 0) {
        return;
      }

      const toY = index * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toX = item.plannedStart
        ? SIDEBAR_WIDTH + dateCalculationService.getDatePosition(
            item.plannedStart,
            timelineStart,
            showWorkingDaysOnly,
            dayWidth
          )
        : SIDEBAR_WIDTH;

      item.dependencies.forEach(depId => {
        const fromItem = itemMap.get(depId);
        if (!fromItem || !fromItem.plannedEnd) return;

        const fromIndex = items.findIndex(i => i.id === depId);
        if (fromIndex === -1) return;

        const fromY = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const fromX = SIDEBAR_WIDTH + dateCalculationService.getDatePosition(
          fromItem.plannedEnd,
          timelineStart,
          showWorkingDaysOnly,
          dayWidth
        ) + dateCalculationService.getBarWidth(
          fromItem.plannedStart!,
          fromItem.plannedEnd,
          showWorkingDaysOnly,
          dayWidth
        );

        // Create path: horizontal line from end of predecessor, vertical line, then to start of successor
        const midX = (fromX + toX) / 2;
        const path = `M ${fromX},${fromY} L ${midX},${fromY} L ${midX},${toY} L ${toX},${toY}`;

        lines.push({
          id: `${fromItem.id}-${item.id}`,
          fromX,
          fromY,
          toX,
          toY,
          path,
        });
      });
    });

    return lines;
  }, [items, timelineStart, showWorkingDaysOnly, dayWidth]);

  if (dependencyLines.length === 0) {
    return null;
  }

  return (
    <g className="gantt-dependencies" aria-label="Task dependencies">
      {dependencyLines.map(line => (
        <g key={line.id}>
          {/* Dependency line */}
          <path
            d={line.path}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="none"
            strokeDasharray="5 3"
            opacity={0.6}
          />
          
          {/* Arrow head */}
          <polygon
            points={`${line.toX},${line.toY} ${line.toX - 6},${line.toY - 4} ${line.toX - 6},${line.toY + 4}`}
            fill="hsl(var(--primary))"
            opacity={0.6}
          />
        </g>
      ))}
    </g>
  );
};
