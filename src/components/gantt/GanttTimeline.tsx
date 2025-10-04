import { useEffect, useRef } from 'react';
import { useGanttScroll } from './GanttScrollContext';

interface MasterTask {
  id: number;
  step_id: number;
  title: string;
  details: string | null;
  planned_start_offset_days: number;
  planned_end_offset_days: number;
  position: number;
  technology_scope: string;
  assigned_role: string | null;
  parent_task_id: number | null;
  level?: number;
}

interface GanttTimelineProps {
  tasks: MasterTask[];
  maxDays: number;
  dayWidth: number;
}

export const GanttTimeline = ({ tasks, maxDays, dayWidth }: GanttTimelineProps) => {
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
    <div 
      ref={timelineRef}
      className="flex-1 min-w-0 overflow-x-scroll"
      onScroll={(e) => handleScroll(e.currentTarget.scrollLeft)}
    >
      <div style={{ minWidth: `${(maxDays + 1) * dayWidth}px` }}>
        {tasks.map(task => {
          const duration = task.planned_end_offset_days - task.planned_start_offset_days;
          const leftOffset = task.planned_start_offset_days * dayWidth;
          const barWidth = Math.max(duration * dayWidth, dayWidth * 0.5);

          return (
            <div key={task.id} className="relative border-b border-border/30 hover:bg-muted/20 h-12">
              {/* Vertical day lines */}
              {Array.from({ length: maxDays + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-border/20"
                  style={{ left: `${i * dayWidth}px` }}
                />
              ))}
              
              {/* Task bar */}
              <div
                className={`absolute top-2 bottom-2 rounded transition-all cursor-pointer ${
                  task.parent_task_id 
                    ? 'bg-orange-400 hover:bg-orange-500' 
                    : 'bg-primary hover:bg-primary/80'
                }`}
                style={{
                  left: `${leftOffset}px`,
                  width: `${barWidth}px`
                }}
                title={`${task.title}: Days ${task.planned_start_offset_days}-${task.planned_end_offset_days} (${duration} days)`}
              >
                <div className="px-2 py-1 text-xs font-medium text-white truncate">
                  {duration}d
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
