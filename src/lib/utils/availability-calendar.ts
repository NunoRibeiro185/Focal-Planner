/**
 * Pure utility functions for the availability calendar panel.
 * No async, no side effects — fully testable in isolation.
 */

import { getMonthGrid } from "@/components/calendar/calendar-event-utils";
import { format } from "date-fns";

/**
 * Returns true if the given date falls in the last week of its month
 * (day 25 or later). When true, the standard month grid naturally shows
 * several days from the following month, providing relevant scheduling context.
 */
export function shouldBleedIntoNextMonth(date: Date): boolean {
  return date.getDate() >= 25;
}

/**
 * Returns the ISO date range that should be queried for the availability
 * calendar. Covers the complete 6-week grid for the event's month, which
 * naturally includes overflow days from adjacent months (already sufficient
 * for last-week bleed-over).
 */
export function getAvailabilityCalendarRange(
  date: Date
): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const grid = getMonthGrid(year, month);
  return {
    start: format(grid[0], "yyyy-MM-dd"),
    end: format(grid[grid.length - 1], "yyyy-MM-dd"),
  };
}
