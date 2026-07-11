/**
 * Calendar Aggregator
 *
 * Merges bookings and personal events into a unified CalendarEvent[] type.
 * This is the single source of truth for what appears on the calendar.
 * UI components are fully agnostic to the underlying data sources.
 */

import { getCalendarBookings, getFutureCalendarBookings, type CalendarBookingItem } from "@/lib/queries/bookings";
import { getPersonalEvents, getFuturePersonalEvents } from "@/lib/queries/personal-events";
import type { CalendarEvent, PersonalEvent } from "@/lib/types";
import { BOOKING_STATUS_COLORS } from "@/lib/utils/booking-status";

// ─── Mappers ─────────────────────────────────────────────────

export function bookingToCalendarEvent(b: CalendarBookingItem): CalendarEvent {
  return {
    kind: "booking",
    id: b.id,
    title: b.client_name_primary,
     
    start: b.event_date!,
     
    end: b.event_date!,
    allDay: !b.start_time,
    color: BOOKING_STATUS_COLORS[b.status],
    status: b.status,
    bookingId: b.id,
    clientName: b.client_name_primary,
    venueName: b.venue_name,
    startTime: b.start_time,
    hoursOfCoverage: b.package_version?.hours_of_coverage ?? null,
    totalPrice: b.total_price,
    currency: b.package_version?.currency ?? "EUR",
  };
}

export function personalEventToCalendarEvent(e: PersonalEvent): CalendarEvent {
  return {
    kind: "personal",
    id: e.id,
    title: e.title,
    start: e.start_date,
    end: e.end_date,
    allDay: e.all_day,
    color: e.color,
    tag: e.tag,
    personalEventId: e.id,
  };
}

// ─── Queries ─────────────────────────────────────────────────

/**
 * Returns merged calendar events for a given date range.
 * Excludes cancelled bookings. Sorted by start date.
 */
export async function getCalendarEvents(
  start: string,
  end: string
): Promise<CalendarEvent[]> {
  const [bookings, personalEvents] = await Promise.all([
    getCalendarBookings(start, end),
    getPersonalEvents(start, end),
  ]);

  const events: CalendarEvent[] = [
    ...bookings.filter((b) => b.event_date != null).map(bookingToCalendarEvent),
    ...personalEvents.map(personalEventToCalendarEvent),
  ];

  return events.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Returns all future calendar events (today onwards) for the agenda view.
 */
export async function getFutureCalendarEvents(): Promise<CalendarEvent[]> {
  const [bookings, personalEvents] = await Promise.all([
    getFutureCalendarBookings(),
    getFuturePersonalEvents(),
  ]);

  const events: CalendarEvent[] = [
    ...bookings.filter((b) => b.event_date != null).map(bookingToCalendarEvent),
    ...personalEvents.map(personalEventToCalendarEvent),
  ];

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
