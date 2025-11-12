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
  onClick?: () => void;
  onDoubleClick?: () => void;
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
  onClick,
  onDoubleClick,
}) => {
  const barHeight = ROW_HEIGHT - (ROW_PADDING * 2);
  const backgroundColor = getItemColor(status, plannedEnd, actualEnd);
  const textColor = getTextColor(backgroundColor);
  const opacity = isHovered ? 0.8 : 1;

  return (
    <g
      role="img"
      aria-label={`${name}: ${status}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Bar background */}
      <rect
        x={0}
        y={ROW_PADDING}
        width={width}
        height={barHeight}
        fill={backgroundColor}
        rx={BAR_BORDER_RADIUS}
        ry={BAR_BORDER_RADIUS}
        opacity={opacity}
        stroke={isSelected ? 'hsl(var(--primary))' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
      />

      {/* Text label */}
      <text
        x={8}
        y={ROW_HEIGHT / 2}
        dominantBaseline="middle"
        fill={textColor}
        fontSize={FONT_SIZE.normal}
        fontWeight={isSelected ? 600 : 400}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {name}
      </text>
    </g>
  );
};
