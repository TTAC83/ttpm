/**
 * SVG bar component for Gantt chart items
 */

import React from 'react';
import { GanttItemStatus } from '../types/gantt.types';
import { getItemColor, getTextColor } from '../utils/ganttColors';
import { ROW_HEIGHT, ROW_PADDING, BAR_BORDER_RADIUS, FONT_SIZE } from '../utils/ganttConstants';

interface GanttBarProps {
  id: string;
  name: string;
  width: number;
  status: GanttItemStatus;
  plannedEnd: Date | null;
  actualEnd: Date | null;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: (event: React.MouseEvent) => void;
}

export const GanttBar: React.FC<GanttBarProps> = ({
  id,
  name,
  width,
  status,
  plannedEnd,
  actualEnd,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  onClick,
  onDoubleClick,
  onDragStart,
}) => {
  const BAR_VERTICAL_PADDING = 8;
  const BAR_HEIGHT = ROW_HEIGHT - (BAR_VERTICAL_PADDING * 2);
  const barColor = getItemColor(status, plannedEnd, actualEnd);
  const textColor = getTextColor(barColor);

  return (
    <g
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onDragStart}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      role="button"
      tabIndex={0}
      aria-label={`${name} - ${status}`}
    >
      <rect
        x={0}
        y={BAR_VERTICAL_PADDING}
        width={width}
        height={BAR_HEIGHT}
        fill={barColor}
        stroke={isSelected ? 'hsl(var(--ring))' : 'hsl(var(--border))'}
        strokeWidth={isSelected ? 2 : 1}
        rx={4}
        opacity={isDragging ? 0.6 : isHovered ? 0.8 : 1}
      />

      <text
        x={8}
        y={ROW_HEIGHT / 2}
        dominantBaseline="middle"
        fill={textColor}
        fontSize={FONT_SIZE.normal}
        fontWeight={600}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {name}
      </text>
    </g>
  );
};
