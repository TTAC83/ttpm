import { useEffect, useRef } from 'react';
import { useGanttScroll } from './GanttScrollContext';

interface GanttHeaderProps {
  maxDays: number;
  dayWidth: number;
}

export const GanttHeader = ({ maxDays, dayWidth }: GanttHeaderProps) => {
  const { handleScroll, registerTimeline, unregisterTimeline } = useGanttScroll();
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      registerTimeline(timelineRef.current);
      return () => {
        if (timelineRef.current) {
          unregisterTimeline(timelineRef.current);
        }
      };
    }
  }, [registerTimeline, unregisterTimeline]);

  return (
    <div className="flex border-b-2 border-border bg-background min-w-0">
      <div className="w-96 flex-shrink-0 bg-muted/50 border-r border-border sticky left-0 z-20">
        <div className="p-3 font-semibold text-sm">
          Tasks & Timeline
        </div>
      </div>
      <div 
        ref={timelineRef}
        className="flex-1 min-w-0 overflow-x-scroll"
        onScroll={(e) => handleScroll(e.currentTarget.scrollLeft)}
      >
        <div 
          className="flex border-b bg-muted/30"
          style={{ minWidth: `${(maxDays + 1) * dayWidth}px` }}
        >
          {Array.from({ length: maxDays + 1 }, (_, i) => (
            <div
              key={i}
              className="flex-shrink-0 text-center text-xs font-medium py-2 border-r border-border/50"
              style={{ width: `${dayWidth}px` }}
            >
              {i}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
