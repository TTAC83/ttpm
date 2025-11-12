/**
 * SVG timeline component with virtual scrolling
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GanttItem, GanttViewMode, DateMarker } from '../types/gantt.types';
import { GanttBar } from './GanttBar';
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
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scroll between header and timeline
  useEffect(() => {
    const headerEl = headerScrollRef.current;
    const timelineEl = timelineScrollRef.current;
    
    if (!headerEl || !timelineEl) return;

    const syncFromTimeline = () => {
      headerEl.scrollLeft = timelineEl.scrollLeft;
    };

    const syncFromHeader = () => {
      timelineEl.scrollLeft = headerEl.scrollLeft;
    };

    timelineEl.addEventListener('scroll', syncFromTimeline);
    headerEl.addEventListener('scroll', syncFromHeader);

    return () => {
      timelineEl.removeEventListener('scroll', syncFromTimeline);
      headerEl.removeEventListener('scroll', syncFromHeader);
    };
  }, []);

  // Sync vertical scroll between sidebar and timeline
  useEffect(() => {
    const sidebarEl = sidebarScrollRef.current;
    const timelineEl = timelineScrollRef.current;
    
    if (!sidebarEl || !timelineEl) return;

    const syncFromTimeline = () => {
      sidebarEl.scrollTop = timelineEl.scrollTop;
    };

    const syncFromSidebar = () => {
      timelineEl.scrollTop = sidebarEl.scrollTop;
    };

    timelineEl.addEventListener('scroll', syncFromTimeline);
    sidebarEl.addEventListener('scroll', syncFromSidebar);

    return () => {
      timelineEl.removeEventListener('scroll', syncFromTimeline);
      sidebarEl.removeEventListener('scroll', syncFromSidebar);
    };
  }, []);

  // Filter items based on view mode
  const visibleItems = useMemo(() => {
    if (viewMode === 'step') {
      return items.filter(item => item.type === 'step');
    }
    // Task mode: show all tasks and subtasks, but not steps
    return items.filter(item => item.type !== 'step');
  }, [items, viewMode]);

  // Use virtualizer for sidebar scroll (but don't use getScrollElement)
  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => null, // We'll manage scroll manually
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Calculate timeline width
  const timelineWidth = dateMarkers.length > 0 
    ? dateMarkers[dateMarkers.length - 1].position + (dayWidth * 7)
    : 1000;

  const totalHeight = visibleItems.length * ROW_HEIGHT;

  return (
    <div className="relative w-full h-full flex flex-col border border-border rounded-lg overflow-hidden">
      {/* Fixed task name header */}
      <div className="flex border-b border-border bg-background" style={{ height: HEADER_HEIGHT }}>
        <div 
          className="flex-shrink-0 flex items-center justify-center border-r border-border bg-muted"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <span className="text-sm font-semibold">
            {viewMode === 'step' ? 'Steps' : 'Tasks'}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed task names sidebar */}
        <div 
          ref={sidebarScrollRef}
          className="flex-shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-background"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div style={{ height: totalHeight }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = visibleItems[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="flex items-center px-4 border-b border-border"
                  style={{
                    height: ROW_HEIGHT,
                    backgroundColor: selectedItemId === item.id ? 'hsl(var(--accent))' : 'transparent',
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
              );
            })}
          </div>
        </div>

        {/* Scrollable timeline container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Date headers - scrollable horizontally */}
          <div 
            ref={headerScrollRef}
            className="overflow-x-auto overflow-y-hidden border-b border-border"
            style={{ height: HEADER_HEIGHT }}
          >
            <svg width={timelineWidth} height={HEADER_HEIGHT}>
              {dateMarkers.map((marker, index) => {
                const markerWidth = index < dateMarkers.length - 1 
                  ? dateMarkers[index + 1].position - marker.position 
                  : dayWidth * 7;
                
                return (
                  <g key={index} transform={`translate(${marker.position}, 0)`}>
                    {(marker.isWeekend || marker.isHoliday) && (
                      <rect
                        x={0}
                        y={0}
                        width={markerWidth}
                        height={HEADER_HEIGHT}
                        fill={marker.isHoliday ? 'hsl(var(--accent) / 0.2)' : GRID_WEEKEND_COLOR}
                      />
                    )}
                    
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
            </svg>
          </div>

          {/* Timeline content - scrollable */}
          <div 
            ref={timelineScrollRef}
            className="flex-1 overflow-auto"
          >
            <svg
              ref={setSvgRef}
              width={timelineWidth}
              height={totalHeight}
              className="block"
              role="img"
              aria-label="Gantt chart timeline"
            >
              {/* Grid background */}
              {dateMarkers.map((marker, index) => {
                const markerWidth = index < dateMarkers.length - 1 
                  ? dateMarkers[index + 1].position - marker.position 
                  : dayWidth * 7;
                
                return (
                  <g key={`grid-${index}`}>
                    {(marker.isWeekend || marker.isHoliday) && (
                      <rect
                        x={marker.position}
                        y={0}
                        width={markerWidth}
                        height={totalHeight}
                        fill={marker.isHoliday ? 'hsl(var(--accent) / 0.1)' : GRID_WEEKEND_COLOR}
                      />
                    )}

                    <line
                      x1={marker.position}
                      y1={0}
                      x2={marker.position}
                      y2={totalHeight}
                      stroke={GRID_LINE_COLOR}
                      strokeWidth={1}
                    />

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

              {/* Dependency lines */}
              {showDependencies && (
                <GanttDependencyLines
                  items={visibleItems}
                  timelineStart={timelineStart}
                  showWorkingDaysOnly={showWorkingDaysOnly}
                  dayWidth={dayWidth}
                />
              )}

              {/* Task bars */}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = visibleItems[virtualRow.index];
                
                const barX = item.plannedStart
                  ? dateCalculationService.getDatePosition(item.plannedStart, timelineStart, showWorkingDaysOnly, dayWidth)
                  : 0;
                
                const barWidth = item.plannedStart && item.plannedEnd
                  ? dateCalculationService.getBarWidth(item.plannedStart, item.plannedEnd, showWorkingDaysOnly, dayWidth)
                  : dayWidth;

                return (
                  <g 
                    key={virtualRow.key}
                    transform={`translate(${barX}, ${virtualRow.index * ROW_HEIGHT})`}
                  >
                    <GanttBar
                      id={item.id}
                      name={item.name}
                      width={barWidth}
                      status={item.status}
                      plannedEnd={item.plannedEnd}
                      actualEnd={item.actualEnd}
                      isSelected={selectedItemId === item.id}
                      isHovered={false}
                      isDragging={draggedItemId === item.id}
                      onClick={() => onItemClick?.(item)}
                      onDoubleClick={() => onItemDoubleClick?.(item)}
                      onDragStart={(event) => onDragStart?.(item, event)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
