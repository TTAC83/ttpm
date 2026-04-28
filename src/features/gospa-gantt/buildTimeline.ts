import type { GospaGanttRow, GospaGanttTree } from "./types";

export function flattenVisible(tree: GospaGanttTree, expanded: Set<string>): GospaGanttRow[] {
  const out: GospaGanttRow[] = [];
  const walk = (key: string) => {
    const row = tree.rows.get(key);
    if (!row) return;
    out.push(row);
    if (expanded.has(key)) {
      row.childKeys.forEach(walk);
    }
  };
  tree.rootKeys.forEach(walk);
  return out;
}

export function computeBounds(rows: GospaGanttRow[]): { start: Date; end: Date } {
  const all: Date[] = [];
  rows.forEach(r => {
    if (r.start) all.push(r.start);
    if (r.end) all.push(r.end);
  });
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (!all.length) {
    const start = new Date(now); start.setDate(start.getDate() - 14);
    const end = new Date(now); end.setDate(end.getDate() + 60);
    return { start, end };
  }
  const min = new Date(Math.min(...all.map(d => d.getTime())));
  const max = new Date(Math.max(...all.map(d => d.getTime())));
  // Pad
  const start = new Date(min); start.setDate(start.getDate() - 7);
  const end = new Date(max); end.setDate(end.getDate() + 14);
  // Ensure today fits
  if (now < start) start.setTime(now.getTime() - 7 * 86400000);
  if (now > end) end.setTime(now.getTime() + 14 * 86400000);
  return { start, end };
}

export function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

export interface DateMarker {
  date: Date;
  position: number;
  label: string;
  isMonthStart: boolean;
  isWeekend: boolean;
  isToday: boolean;
}

export function generateDateMarkers(start: Date, end: Date, dayWidth: number, zoom: number): DateMarker[] {
  const markers: DateMarker[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = diffDays(start, end);
  // Step: day if zoom>=1, else week
  const step = zoom >= 1 ? 1 : 7;
  for (let i = 0; i <= totalDays; i += step) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const isMonthStart = d.getDate() === 1 || i === 0;
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const label = step === 1
      ? `${d.getDate()}`
      : `${d.getDate()}/${d.getMonth() + 1}`;
    markers.push({
      date: d,
      position: i * dayWidth,
      label,
      isMonthStart,
      isWeekend,
      isToday: d.getTime() === today.getTime(),
    });
  }
  return markers;
}

export interface MonthBand {
  position: number;
  width: number;
  label: string;
}

export function generateMonthBands(start: Date, end: Date, dayWidth: number): MonthBand[] {
  const bands: MonthBand[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endTime = end.getTime();
  while (cursor.getTime() <= endTime) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const visibleStart = monthStart < start ? start : monthStart;
    const visibleEnd = monthEnd > end ? end : monthEnd;
    const left = diffDays(start, visibleStart) * dayWidth;
    const width = Math.max(0, diffDays(visibleStart, visibleEnd) * dayWidth);
    if (width > 0) {
      bands.push({
        position: left,
        width,
        label: monthStart.toLocaleString("en-GB", { month: "short", year: "numeric" }),
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return bands;
}

export function dateToX(date: Date, start: Date, dayWidth: number): number {
  return diffDays(start, date) * dayWidth;
}
