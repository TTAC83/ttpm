/**
 * Hook for Gantt chart accessibility features
 * Handles keyboard navigation and ARIA attributes
 */

import { useEffect, useCallback, useRef } from 'react';
import { GanttItem } from '../types/gantt.types';

interface UseGanttAccessibilityOptions {
  items: GanttItem[];
  selectedItemId: string | null;
  onItemSelect: (itemId: string | null) => void;
  onItemActivate?: (item: GanttItem) => void;
  enabled?: boolean;
}

export const useGanttAccessibility = ({
  items,
  selectedItemId,
  onItemSelect,
  onItemActivate,
  enabled = true,
}: UseGanttAccessibilityOptions) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Find the index of the currently selected item
   */
  const getSelectedIndex = useCallback(() => {
    if (!selectedItemId) return -1;
    return items.findIndex((item) => item.id === selectedItemId);
  }, [items, selectedItemId]);

  /**
   * Navigate to next item
   */
  const navigateNext = useCallback(() => {
    const currentIndex = getSelectedIndex();
    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    onItemSelect(items[nextIndex]?.id || null);
  }, [items, getSelectedIndex, onItemSelect]);

  /**
   * Navigate to previous item
   */
  const navigatePrevious = useCallback(() => {
    const currentIndex = getSelectedIndex();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    onItemSelect(items[prevIndex]?.id || null);
  }, [items, getSelectedIndex, onItemSelect]);

  /**
   * Activate selected item (trigger edit/details)
   */
  const activateSelected = useCallback(() => {
    if (!selectedItemId) return;
    const item = items.find((item) => item.id === selectedItemId);
    if (item && onItemActivate) {
      onItemActivate(item);
    }
  }, [items, selectedItemId, onItemActivate]);

  /**
   * Keyboard event handler
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Only handle keyboard navigation when Gantt chart is focused
      const target = event.target as HTMLElement;
      if (!containerRef.current?.contains(target)) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          navigateNext();
          break;
        case 'ArrowUp':
          event.preventDefault();
          navigatePrevious();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          activateSelected();
          break;
        case 'Escape':
          event.preventDefault();
          onItemSelect(null);
          break;
        case 'Home':
          event.preventDefault();
          onItemSelect(items[0]?.id || null);
          break;
        case 'End':
          event.preventDefault();
          onItemSelect(items[items.length - 1]?.id || null);
          break;
        default:
          break;
      }
    },
    [enabled, items, navigateNext, navigatePrevious, activateSelected, onItemSelect]
  );

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  /**
   * Get ARIA attributes for the container
   */
  const getContainerProps = useCallback(() => {
    return {
      ref: containerRef,
      role: 'application',
      'aria-label': 'Gantt Chart',
      'aria-roledescription': 'Project timeline visualization',
      tabIndex: 0,
    };
  }, []);

  /**
   * Get ARIA attributes for an item
   */
  const getItemProps = useCallback(
    (item: GanttItem) => {
      const isSelected = item.id === selectedItemId;
      return {
        role: 'row',
        'aria-label': `${item.type}: ${item.name}, Status: ${item.status}`,
        'aria-selected': isSelected,
        tabIndex: isSelected ? 0 : -1,
      };
    },
    [selectedItemId]
  );

  /**
   * Get ARIA attributes for the timeline area
   */
  const getTimelineProps = useCallback(() => {
    return {
      role: 'grid',
      'aria-label': 'Project timeline grid',
      'aria-readonly': 'true',
    };
  }, []);

  return {
    containerRef,
    getContainerProps,
    getItemProps,
    getTimelineProps,
    navigateNext,
    navigatePrevious,
    activateSelected,
  };
};
