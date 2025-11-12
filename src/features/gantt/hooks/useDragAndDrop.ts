/**
 * Hook for drag-and-drop rescheduling of Gantt tasks
 */

import { useState, useCallback, useRef } from 'react';
import { GanttItem } from '../types/gantt.types';
import { dateCalculationService } from '../services/dateCalculationService';

interface UseDragAndDropProps {
  items: GanttItem[];
  timelineStart: Date;
  showWorkingDaysOnly: boolean;
  dayWidth: number;
  onItemUpdate: (itemId: string, newDates: { plannedStart: Date; plannedEnd: Date }) => Promise<void>;
}

interface DragState {
  itemId: string;
  offsetX: number;
  originalStart: Date;
  originalEnd: Date;
}

export const useDragAndDrop = ({
  items,
  timelineStart,
  showWorkingDaysOnly,
  dayWidth,
  onItemUpdate,
}: UseDragAndDropProps) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback((item: GanttItem, event: React.MouseEvent) => {
    if (!item.plannedStart || !item.plannedEnd) return;
    
    event.preventDefault();
    event.stopPropagation();

    const barX = dateCalculationService.getDatePosition(
      item.plannedStart,
      timelineStart,
      showWorkingDaysOnly,
      dayWidth
    );

    setDragState({
      itemId: item.id,
      offsetX: event.clientX - barX,
      originalStart: item.plannedStart,
      originalEnd: item.plannedEnd,
    });
    setIsDragging(true);
    dragStartPos.current = { x: event.clientX, y: event.clientY };
  }, [timelineStart, showWorkingDaysOnly, dayWidth]);

  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!dragState || !isDragging) return;

    const item = items.find(i => i.id === dragState.itemId);
    if (!item || !item.plannedStart || !item.plannedEnd) return;

    // Calculate new position
    const newX = event.clientX - dragState.offsetX;
    
    // Convert pixel position to date
    const daysMoved = Math.round(newX / dayWidth);
    const newStart = new Date(timelineStart);
    
    if (showWorkingDaysOnly) {
      const workingDaysMoved = daysMoved;
      let daysAdded = 0;
      let currentDate = new Date(timelineStart);
      
      while (daysAdded < Math.abs(workingDaysMoved)) {
        currentDate.setDate(currentDate.getDate() + (workingDaysMoved > 0 ? 1 : -1));
        if (!dateCalculationService.isWeekend(currentDate)) {
          daysAdded++;
        }
      }
      newStart.setTime(currentDate.getTime());
    } else {
      newStart.setDate(newStart.getDate() + daysMoved);
    }

    // Calculate duration
    const duration = dateCalculationService.getWorkingDaysBetween(
      dragState.originalStart,
      dragState.originalEnd
    );

    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + duration);

    // Update the item temporarily (visual feedback)
    item.plannedStart = newStart;
    item.plannedEnd = newEnd;
  }, [dragState, isDragging, items, timelineStart, showWorkingDaysOnly, dayWidth]);

  const handleDragEnd = useCallback(async (event: MouseEvent) => {
    if (!dragState || !isDragging) return;

    const item = items.find(i => i.id === dragState.itemId);
    if (!item || !item.plannedStart || !item.plannedEnd) {
      setDragState(null);
      setIsDragging(false);
      return;
    }

    // Check if actually moved (threshold of 5px)
    const moved = dragStartPos.current 
      ? Math.abs(event.clientX - dragStartPos.current.x) > 5
      : true;

    if (moved) {
      try {
        await onItemUpdate(item.id, {
          plannedStart: item.plannedStart,
          plannedEnd: item.plannedEnd,
        });
      } catch (error) {
        console.error('Failed to update item dates:', error);
        // Revert to original dates
        item.plannedStart = dragState.originalStart;
        item.plannedEnd = dragState.originalEnd;
      }
    } else {
      // Revert if not moved
      item.plannedStart = dragState.originalStart;
      item.plannedEnd = dragState.originalEnd;
    }

    setDragState(null);
    setIsDragging(false);
    dragStartPos.current = null;
  }, [dragState, isDragging, items, onItemUpdate]);

  return {
    isDragging,
    draggedItemId: dragState?.itemId || null,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
};
