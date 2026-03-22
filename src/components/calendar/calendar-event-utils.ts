/**
 * Pure utility functions for the calendar UI.
 * No async, no side effects — fully testable.
 */

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns";
import type { CalendarEvent } from "@/lib/types";

/**
 * Returns the full 6-week grid of Date objects for a given month.
 * Always starts on Sunday, always returns 42 days.
 */
export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = startOfMonth(new Date(year, month));
  const lastDay = endOfMonth(firstDay);
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(lastDay, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

/**
 * Groups events by their start date string (YYYY-MM-DD).
 * Multi-day personal events appear on every day within their range.
 */
export function groupEventsByDate(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const start = parseISO(event.start);
    const end = parseISO(event.end);

    if (isSameDay(start, end) || event.kind === "booking") {
      const key = event.start;
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, event]);
    } else {
      // Multi-day personal event — add to each day in the range
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const key = format(day, "yyyy-MM-dd");
        const existing = map.get(key) ?? [];
        map.set(key, [...existing, event]);
      }
    }
  }

  return map;
}

/**
 * Returns events for a specific day from the grouped map.
 */
export function getEventsForDay(
  grouped: Map<string, CalendarEvent[]>,
  day: Date
): CalendarEvent[] {
  const key = format(day, "yyyy-MM-dd");
  return grouped.get(key) ?? [];
}

/**
 * Formats a CalendarEvent's time for display.
 */
export function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return "All day";
  if (event.kind === "booking" && event.startTime) {
    // Format "HH:MM:SS" → "HH:MM"
    return event.startTime.slice(0, 5);
  }
  return "";
}

/**
 * Groups a flat list of future events by date for the agenda view.
 * Returns an array of { dateKey, label, events } sorted chronologically.
 */
export function groupEventsForAgenda(
  events: CalendarEvent[]
): Array<{ dateKey: string; label: string; events: CalendarEvent[] }> {
  const map = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = event.start;
    const existing = map.get(key) ?? [];
    map.set(key, [...existing, event]);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, evts]) => ({
      dateKey,
      label: format(parseISO(dateKey), "EEEE, d MMMM yyyy"),
      events: evts,
    }));
}

/**
 * Describes a multi-day event's layout within a single week row.
 */
export type SpanLayout = {
  event: CalendarEvent;
  startCol: number; // 0–6 within this week
  endCol: number;   // 0–6 within this week
  lane: number;     // vertical row index (0 = topmost)
  isStart: boolean; // true if the event actually starts in this week
  isEnd: boolean;   // true if the event actually ends in this week
};

/**
 * Computes spanning layout for multi-day events in a single week row.
 * Only non-booking events that span multiple days are treated as spans.
 */
export function computeWeekSpans(
  weekDays: Date[],
  events: CalendarEvent[]
): SpanLayout[] {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const multiDay = events.filter((e) => {
    if (e.kind === "booking") return false;
    const eStart = parseISO(e.start);
    const eEnd = parseISO(e.end);
    return !isSameDay(eStart, eEnd) && eStart <= weekEnd && eEnd >= weekStart;
  });

  // Sort by start date (earlier first), then longer duration first
  multiDay.sort((a, b) => {
    const aStart = parseISO(a.start);
    const bStart = parseISO(b.start);
    if (aStart < bStart) return -1;
    if (aStart > bStart) return 1;
    return parseISO(b.end) > parseISO(a.end) ? -1 : 1;
  });

  const candidates = multiDay.map((event) => {
    const eStart = parseISO(event.start);
    const eEnd = parseISO(event.end);
    const isStart = eStart >= weekStart;
    const isEnd = eEnd <= weekEnd;
    const startCol = isStart ? weekDays.findIndex((d) => isSameDay(d, eStart)) : 0;
    const endCol = isEnd ? weekDays.findIndex((d) => isSameDay(d, eEnd)) : 6;
    return { event, startCol, endCol, isStart, isEnd };
  });

  // Greedy lane assignment: place in the first lane where it fits
  const laneEndCols: number[] = [];
  return candidates.map((c) => {
    let lane = laneEndCols.findIndex((endCol) => endCol < c.startCol);
    if (lane === -1) lane = laneEndCols.length;
    laneEndCols[lane] = c.endCol;
    return { ...c, lane };
  });
}

/**
 * Returns the ISO date range string for a given month (for DB queries).
 */
export function getMonthDateRange(year: number, month: number): { start: string; end: string } {
  const grid = getMonthGrid(year, month);
  return {
    start: format(grid[0], "yyyy-MM-dd"),
    end: format(grid[grid.length - 1], "yyyy-MM-dd"),
  };
}

export { format, isSameMonth, isSameDay, parseISO };
