import { useEffect, useMemo, useRef } from "react";
import { ScheduleXCalendar as SXCalendar, useCalendarApp } from "@schedule-x/react";
import {
  createViewMonthGrid,
  createViewMonthAgenda,
  createViewWeek,
  createViewDay,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import "@schedule-x/theme-default/dist/index.css";

import type { SXEvent } from "@/lib/calendarEventMappers";
import type { CalendarEvent } from "@/lib/calendarEventsService";

interface Props {
  events: SXEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date) => void;
  onEventUpdate?: (eventId: string, newStart: string, newEnd: string, meta: CalendarEvent) => void;
}

const VIEW_STORAGE_KEY = "globalCalendar.lastView";

const calendars = {
  implementation: {
    colorName: "implementation",
    lightColors: { main: "#3b82f6", container: "#dbeafe", onContainer: "#1e3a8a" },
    darkColors: { main: "#60a5fa", onContainer: "#dbeafe", container: "#1e3a8a" },
  },
  solutions: {
    colorName: "solutions",
    lightColors: { main: "#10b981", container: "#d1fae5", onContainer: "#064e3b" },
    darkColors: { main: "#34d399", onContainer: "#d1fae5", container: "#064e3b" },
  },
  standalone: {
    colorName: "standalone",
    lightColors: { main: "#6b7280", container: "#e5e7eb", onContainer: "#1f2937" },
    darkColors: { main: "#9ca3af", onContainer: "#e5e7eb", container: "#374151" },
  },
  critical: {
    colorName: "critical",
    lightColors: { main: "#ef4444", container: "#fee2e2", onContainer: "#7f1d1d" },
    darkColors: { main: "#f87171", onContainer: "#fee2e2", container: "#7f1d1d" },
  },
};

export const ScheduleXCalendar = ({ events, onEventClick, onSlotClick, onEventUpdate }: Props) => {
  const eventsServiceRef = useRef(createEventsServicePlugin());
  const dragAndDropRef = useRef(createDragAndDropPlugin());
  const currentTimeRef = useRef(createCurrentTimePlugin());

  const initialView = useMemo(() => {
    if (typeof window === "undefined") return "month-grid";
    return localStorage.getItem(VIEW_STORAGE_KEY) ?? "month-grid";
  }, []);

  // Lookup map for click handlers (SX returns the SX event, we need the meta)
  const metaMap = useMemo(() => {
    const m = new Map<string, CalendarEvent>();
    events.forEach((e) => m.set(e.id, e._meta));
    return m;
  }, [events]);

  const calendarApp = useCalendarApp(
    {
      views: [createViewMonthGrid(), createViewWeek(), createViewDay(), createViewMonthAgenda()],
      defaultView: initialView as any,
      events,
      calendars,
      callbacks: {
        onEventClick: (calendarEvent: any) => {
          const meta = metaMap.get(String(calendarEvent.id));
          if (meta && onEventClick) onEventClick(meta);
        },
        onClickDate: (date: any) => {
          if (onSlotClick) onSlotClick(new Date(String(date)));
        },
        onClickDateTime: (dateTime: any) => {
          if (onSlotClick) onSlotClick(new Date(String(dateTime)));
        },
        onEventUpdate: (updatedEvent: any) => {
          const meta = metaMap.get(String(updatedEvent.id));
          if (meta && onEventUpdate) {
            const startStr = updatedEvent.start?.toString?.() ?? String(updatedEvent.start);
            const endStr = updatedEvent.end?.toString?.() ?? String(updatedEvent.end);
            onEventUpdate(
              String(updatedEvent.id),
              startStr.slice(0, 10),
              endStr.slice(0, 10),
              meta
            );
          }
        },
        onRangeUpdate: () => {
          try {
            const view = (calendarApp as any)?.calendarState?.view?.value;
            if (view) localStorage.setItem(VIEW_STORAGE_KEY, view);
          } catch { /* noop */ }
        },
      },
    },
    [eventsServiceRef.current, dragAndDropRef.current, currentTimeRef.current]
  );


  // Sync events when prop changes
  useEffect(() => {
    eventsServiceRef.current.set(events);
  }, [events]);

  return (
    <div className="sx-react-calendar-wrapper" style={{ height: "700px" }}>
      <SXCalendar calendarApp={calendarApp} />
    </div>
  );
};

export default ScheduleXCalendar;
