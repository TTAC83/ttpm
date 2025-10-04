import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';

interface GanttScrollContextType {
  scrollLeft: number;
  handleScroll: (scrollLeft: number) => void;
  registerTimeline: (ref: HTMLDivElement) => void;
  unregisterTimeline: (ref: HTMLDivElement) => void;
}

const GanttScrollContext = createContext<GanttScrollContextType | null>(null);

export const useGanttScroll = () => {
  const context = useContext(GanttScrollContext);
  if (!context) {
    throw new Error('useGanttScroll must be used within GanttScrollProvider');
  }
  return context;
};

interface GanttScrollProviderProps {
  children: ReactNode;
}

export const GanttScrollProvider = ({ children }: GanttScrollProviderProps) => {
  const [scrollLeft, setScrollLeft] = useState(0);
  const timelineRefs = useRef<Set<HTMLDivElement>>(new Set());
  const isSyncing = useRef(false);

  const registerTimeline = useCallback((ref: HTMLDivElement) => {
    timelineRefs.current.add(ref);
  }, []);

  const unregisterTimeline = useCallback((ref: HTMLDivElement) => {
    timelineRefs.current.delete(ref);
  }, []);

  const handleScroll = useCallback((newScrollLeft: number) => {
    if (isSyncing.current) return;
    
    isSyncing.current = true;
    setScrollLeft(newScrollLeft);
    
    requestAnimationFrame(() => {
      timelineRefs.current.forEach(ref => {
        if (ref.scrollLeft !== newScrollLeft) {
          ref.scrollLeft = newScrollLeft;
        }
      });
      isSyncing.current = false;
    });
  }, []);

  return (
    <GanttScrollContext.Provider value={{ scrollLeft, handleScroll, registerTimeline, unregisterTimeline }}>
      {children}
    </GanttScrollContext.Provider>
  );
};
