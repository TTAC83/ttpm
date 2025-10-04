import { useEffect, useRef } from 'react';
import { useGanttScroll } from './GanttScrollContext';

interface BottomScrollbarProps {
  maxDays: number;
  dayWidth: number;
  frozenWidth: number;
}

export const BottomScrollbar = ({ maxDays, dayWidth, frozenWidth }: BottomScrollbarProps) => {
  const { handleScroll, registerTimeline, unregisterTimeline } = useGanttScroll();
  const scrollbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollbarRef.current) {
      registerTimeline(scrollbarRef.current);
      return () => {
        if (scrollbarRef.current) {
          unregisterTimeline(scrollbarRef.current);
        }
      };
    }
  }, [registerTimeline, unregisterTimeline]);

  const totalWidth = (maxDays + 1) * dayWidth + frozenWidth;

  return (
    <div 
      ref={scrollbarRef}
      className="absolute bottom-0 left-0 right-0 h-4 overflow-x-scroll overflow-y-hidden force-scrollbars bg-muted/20 border-t border-border z-30"
      onScroll={(e) => handleScroll(e.currentTarget.scrollLeft)}
      aria-label="Timeline horizontal scroll"
    >
      <div style={{ width: `${totalWidth}px`, height: '12px' }} />
    </div>
  );
};
