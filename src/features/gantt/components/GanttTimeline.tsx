/**
 * SVG timeline component with virtual scrolling
 */

import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GanttItem, GanttViewMode, DateMarker } from '../types/gantt.types';
import { GanttRow } from './GanttRow';
import { GanttDependencyLines } from './GanttDependencyLines';
import { ROW_HEIGHT, SIDEBAR_WIDTH, HEADER_HEIGHT, GRID_LINE_COLOR, GRID_WEEKEND_COLOR, FONT_SIZE } from '../utils/ganttConstants';
import { dateCalculationService } from '../services/dateCalculationService';

interface GanttTimelineProps {
  items: GanttItem[];
  viewMode: GanttViewMode;
  dayWidth: number;
  timelineStart: Date;
  timelineEnd: Date;
  dateMarkers: DateMarker[];
  showWorkingDaysOnly?: boolean;
  showDependencies?: boolean;
  selectedItemId?: string | null;
  draggedItemId?: string | null;
  onItemClick?: (item: GanttItem) => void;
  onItemDoubleClick?: (item: GanttItem) => void;
  onDragStart?: (item: GanttItem, event: React.MouseEvent) => void;
  setSvgRef?: (element: SVGSVGElement | null) => void;
  getItemProps?: (item: GanttItem) => any;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  items,
  viewMode,
  dayWidth,
  timelineStart,
  timelineEnd,
  dateMarkers,
  showWorkingDaysOnly = false,
  showDependencies = true,
  selectedItemId = null,
  draggedItemId = null,
  onItemClick,
  onItemDoubleClick,
  onDragStart,
  setSvgRef,
  getItemProps,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter items based on view mode
  const visibleItems = useMemo(() => {
    if (viewMode === 'step') {
      return items.filter(item => item.type === 'step');
    }
    // Task mode: show all tasks and subtasks, but not steps
    return items.filter(item => item.type !== 'step');
  }, [items, viewMode]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Calculate timeline width
  const timelineWidth = dateMarkers.length > 0 
    ? dateMarkers[dateMarkers.length - 1].position + dayWidth
    : 1000;

  const totalHeight = visibleItems.length * ROW_HEIGHT;

  return (
    <div className="relative w-full h-full overflow-hidden border border-border rounded-lg">
          {/* Date axis header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border" style={{ height: HEADER_HEIGHT }}>
        <svg width="100%" height={HEADER_HEIGHT}>
          {/* Sidebar header */}
          <rect x={0} y={0} width={SIDEBAR_WIDTH} height={HEADER_HEIGHT} fill="hsl(var(--muted))" />
          <text
            x={SIDEBAR_WIDTH / 2}
            y={HEADER_HEIGHT / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={FONT_SIZE.normal}
            fontWeight={600}
            fill="hsl(var(--foreground))"
          >
            {viewMode === 'step' ? 'Steps' : 'Tasks'}
          </text>

          {/* Date markers */}
          <g transform={`translate(${SIDEBAR_WIDTH}, 0)`}>
            {dateMarkers.map((marker, index) => {
              const markerWidth = index < dateMarkers.length - 1 
                ? dateMarkers[index + 1].position - marker.position 
                : dayWidth * 7; // Default to week width for last marker
              
              return (
                <g key={index} transform={`translate(${marker.position}, 0)`}>
                  {/* Weekend/holiday background */}
                  {(marker.isWeekend || marker.isHoliday) && (
                    <rect
                      x={0}
                      y={0}
                      width={markerWidth}
                      height={HEADER_HEIGHT}
                      fill={marker.isHoliday ? 'hsl(var(--accent) / 0.2)' : GRID_WEEKEND_COLOR}
                    />
                  )}
                  
                  {/* Date label */}
                  <text
                    x={markerWidth / 2}
                    y={HEADER_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={FONT_SIZE.small}
                    fill="hsl(var(--muted-foreground))"
                    fontWeight={marker.isToday ? 600 : 400}
                  >
                    {marker.label}
                  </text>

                  {/* Grid line */}
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={HEADER_HEIGHT}
                    stroke={GRID_LINE_COLOR}
                    strokeWidth={1}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto"
        style={{ height: 'calc(100% - 60px)' }}
      >
        <svg
          ref={setSvgRef}
          width={SIDEBAR_WIDTH + timelineWidth}
          height={totalHeight}
          className="block"
          role="img"
          aria-label="Gantt chart timeline"
        >
          {/* Grid background */}
          <g transform={`translate(${SIDEBAR_WIDTH}, 0)`}>
            {dateMarkers.map((marker, index) => {
              const markerWidth = index < dateMarkers.length - 1 
                ? dateMarkers[index + 1].position - marker.position 
                : dayWidth * 7; // Default to week width
              
              return (
                <g key={`grid-${index}`}>
                  {/* Weekend/holiday column background */}
                  {(marker.isWeekend || marker.isHoliday) && (
                    <rect
                      x={marker.position}
                      y={0}
                      width={markerWidth}
                      height={totalHeight}
                      fill={marker.isHoliday ? 'hsl(var(--accent) / 0.1)' : GRID_WEEKEND_COLOR}
                    />
                  )}

                  {/* Vertical grid line */}
                  <line
                    x1={marker.position}
                    y1={0}
                    x2={marker.position}
                    y2={totalHeight}
                    stroke={GRID_LINE_COLOR}
                    strokeWidth={1}
                  />

                  {/* Today line */}
                  {marker.isToday && (
                    <line
                      x1={marker.position}
                      y1={0}
                      x2={marker.position}
                      y2={totalHeight}
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Dependency lines */}
          {showDependencies && (
            <GanttDependencyLines
              items={visibleItems}
              timelineStart={timelineStart}
              showWorkingDaysOnly={showWorkingDaysOnly}
              dayWidth={dayWidth}
            />
          )}

          {/* Virtual rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = visibleItems[virtualRow.index];
            
            // Calculate bar position and width
            const barX = item.plannedStart
              ? dateCalculationService.getDatePosition(item.plannedStart, timelineStart, showWorkingDaysOnly, dayWidth)
              : 0;
            
            const barWidth = item.plannedStart && item.plannedEnd
              ? dateCalculationService.getBarWidth(item.plannedStart, item.plannedEnd, showWorkingDaysOnly, dayWidth)
              : dayWidth;

            return (
              <GanttRow
                key={virtualRow.key}
                item={item}
                barX={barX}
                barWidth={barWidth}
                rowIndex={virtualRow.index}
                isSelected={selectedItemId === item.id}
                isHovered={false}
                isDragging={draggedItemId === item.id}
                onItemClick={onItemClick}
                onItemDoubleClick={onItemDoubleClick}
                onDragStart={onDragStart}
                ariaProps={getItemProps?.(item)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};
