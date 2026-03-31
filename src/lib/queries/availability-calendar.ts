/**
 * Data fetching for the availability calendar panel on the booking detail page.
 * Combines all bookings (including cancelled) and personal events for the
 * event's month, giving the photographer a full picture of schedule pressure.
 */

import { getAllBookingsByDateRange } from "@/lib/queries/bookings";
import { getPersonalEvents } from "@/lib/queries/personal-events";
import {
  bookingToCalendarEvent,
  personalEventToCalendarEvent,
} from "@/lib/services/calendar-aggregator";
import { getAvailabilityCalendarRange } from "@/lib/utils/availability-calendar";
import type { CalendarEvent } from "@/lib/types";
import { parseISO } from "date-fns";

/**
 * Returns all calendar events relevant for the availability mini-calendar.
 * Unlike the main calendar query, this includes cancelled bookings.
 *
 * @param eventDate - YYYY-MM-DD string of the booking's event date
 */
export async function getCalendarEventsForAvailabilityPanel(
  eventDate: string
): Promise<CalendarEvent[]> {
  const date = parseISO(eventDate);
  const { start, end } = getAvailabilityCalendarRange(date);

  const [bookings, personalEvents] = await Promise.all([
    getAllBookingsByDateRange(start, end),
    getPersonalEvents(start, end),
  ]);

  return [
    ...bookings.filter((b) => b.event_date != null).map(bookingToCalendarEvent),
    ...personalEvents.map(personalEventToCalendarEvent),
  ].sort((a, b) => a.start.localeCompare(b.start));
}
