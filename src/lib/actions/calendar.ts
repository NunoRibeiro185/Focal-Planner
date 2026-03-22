"use server";

import { getCalendarEvents } from "@/lib/services/calendar-aggregator";

/**
 * Server Action wrapper around the calendar aggregator.
 * Client components must call this to fetch events — they cannot
 * import the aggregator directly (it depends on server-only APIs).
 */
export async function fetchCalendarEvents(start: string, end: string) {
  return getCalendarEvents(start, end);
}
