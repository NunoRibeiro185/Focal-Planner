"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  listCalendars,
  pushEvent,
  updateEvent,
  deleteEvent,
  bulkPushEvents,
  type GoogleCalendarListItem,
} from "@/lib/services/google-calendar";
import { personalEventToCalendarEvent, bookingToCalendarEvent } from "@/lib/services/calendar-aggregator";
import { getFutureBookings } from "@/lib/queries/bookings";
import { getFuturePersonalEvents } from "@/lib/queries/personal-events";
import type { GoogleCalendarToken } from "@/lib/types";

// ─── Internal helpers ─────────────────────────────────────────

/**
 * Reads the stored token and refreshes it if it expires within 5 minutes.
 * Returns null if not connected.
 */
async function getValidToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photographerId: string
): Promise<GoogleCalendarToken | null> {
  const { data: token } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("photographer_id", photographerId)
    .single();

  if (!token) return null;

  const expiryMs = new Date(token.token_expiry).getTime();
  const fiveMinutesMs = 5 * 60 * 1000;

  if (expiryMs - Date.now() < fiveMinutesMs) {
    try {
      const refreshed = await refreshAccessToken(token.refresh_token);
      await supabase
        .from("google_calendar_tokens")
        .update({
          access_token: refreshed.access_token,
          token_expiry: refreshed.expiry_date.toISOString(),
        })
        .eq("photographer_id", photographerId);

      return {
        ...token,
        access_token: refreshed.access_token,
        token_expiry: refreshed.expiry_date.toISOString(),
      };
    } catch (e) {
      console.error("[GoogleSync] Token refresh failed:", e);
      return null;
    }
  }

  return token as GoogleCalendarToken;
}

// ─── Sync helpers (called from other actions) ─────────────────

/**
 * Syncs a booking to Google Calendar. Op: create | update | delete.
 * Never throws — booking flow must always succeed.
 */
export async function syncBookingToGoogle(
  bookingId: string,
  op: "create" | "update" | "delete"
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const token = await getValidToken(supabase, user.id);
    if (!token || !token.selected_calendar_id) return;

    const { data: booking } = await supabase
      .from("bookings")
      .select("*, package_version:package_versions(*), payment_log_entries(amount)")
      .eq("id", bookingId)
      .eq("photographer_id", user.id)
      .single();

    if (!booking) return;

    const calEvent = bookingToCalendarEvent({
      ...booking,
      package_version: (booking as any).package_version,
      amount_paid: 0,
      balance: 0,
      overdue: false,
    });

    if (op === "create") {
      const googleId = await pushEvent(
        token.access_token,
        token.selected_calendar_id,
        calEvent,
        booking.start_time
      );
      await supabase
        .from("bookings")
        .update({ google_event_id: googleId })
        .eq("id", bookingId);
    } else if (op === "update" && booking.google_event_id) {
      await updateEvent(
        token.access_token,
        token.selected_calendar_id,
        booking.google_event_id,
        calEvent,
        booking.start_time
      );
    } else if (op === "delete" && booking.google_event_id) {
      await deleteEvent(
        token.access_token,
        token.selected_calendar_id,
        booking.google_event_id
      );
    }
  } catch (e) {
    console.error("[GoogleSync] syncBookingToGoogle:", e);
  }
}

/**
 * Syncs a personal event to Google Calendar. Op: create | update.
 */
export async function syncPersonalEventToGoogle(
  eventId: string,
  op: "create" | "update"
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const token = await getValidToken(supabase, user.id);
    if (!token || !token.selected_calendar_id) return;

    const { data: event } = await supabase
      .from("personal_events")
      .select("*")
      .eq("id", eventId)
      .eq("photographer_id", user.id)
      .single();

    if (!event) return;

    const calEvent = personalEventToCalendarEvent(event);

    if (op === "create") {
      const googleId = await pushEvent(
        token.access_token,
        token.selected_calendar_id,
        calEvent,
        event.start_time,
        event.end_time
      );
      await supabase
        .from("personal_events")
        .update({ google_event_id: googleId })
        .eq("id", eventId);
    } else if (op === "update" && event.google_event_id) {
      await updateEvent(
        token.access_token,
        token.selected_calendar_id,
        event.google_event_id,
        calEvent,
        event.start_time,
        event.end_time
      );
    }
  } catch (e) {
    console.error("[GoogleSync] syncPersonalEventToGoogle:", e);
  }
}

/**
 * Deletes a personal event from Google Calendar by googleEventId.
 */
export async function deletePersonalEventFromGoogle(
  googleEventId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const token = await getValidToken(supabase, user.id);
    if (!token || !token.selected_calendar_id) return;

    await deleteEvent(token.access_token, token.selected_calendar_id, googleEventId);
  } catch (e) {
    console.error("[GoogleSync] deletePersonalEventFromGoogle:", e);
  }
}

// ─── Public actions ───────────────────────────────────────────

/**
 * Builds the Google OAuth URL and stores a CSRF state cookie.
 * Returns the URL for the client to redirect to.
 */
export async function initiateGoogleCalendarConnect(): Promise<string> {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  return buildAuthUrl(state);
}

/**
 * Exchanges the OAuth code for tokens, stores them, and bulk-pushes existing bookings.
 * Called from the OAuth callback route.
 */
export async function connectGoogleCalendar(
  code: string,
  state: string
): Promise<void> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_calendar_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    throw new Error("Invalid OAuth state — possible CSRF");
  }

  cookieStore.delete("google_calendar_oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const tokens = await exchangeCodeForTokens(code);

  await supabase.from("google_calendar_tokens").upsert(
    {
      photographer_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date.toISOString(),
      selected_calendar_id: null,
      selected_calendar_name: null,
    },
    { onConflict: "photographer_id" }
  );

  revalidatePath("/settings");
  revalidatePath("/calendar");
}

/**
 * Updates the selected calendar and triggers a bulk push of all future bookings.
 */
export async function selectGoogleCalendar(
  calendarId: string,
  calendarName: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  await supabase
    .from("google_calendar_tokens")
    .update({
      selected_calendar_id: calendarId,
      selected_calendar_name: calendarName,
    })
    .eq("photographer_id", user.id);

  // Bulk push all future non-cancelled bookings and personal events
  const token = await getValidToken(supabase, user.id);
  if (token) {
    try {
      const [futureBookings, futurePersonalEvents] = await Promise.all([
        getFutureBookings(),
        getFuturePersonalEvents(),
      ]);

      const bookingEvents = futureBookings
        .filter((b) => b.event_date != null)
        .map((b) => ({
          event: bookingToCalendarEvent(b),
          localId: b.id,
          startTime: b.start_time,
        }));

      const personalEvents = futurePersonalEvents.map((e) => ({
        event: personalEventToCalendarEvent(e),
        localId: e.id,
        startTime: e.start_time,
        endTime: e.end_time,
      }));

      const [bookingResults, personalResults] = await Promise.all([
        bulkPushEvents(token.access_token, calendarId, bookingEvents),
        bulkPushEvents(token.access_token, calendarId, personalEvents),
      ]);

      for (const [bookingId, googleId] of bookingResults.entries()) {
        await supabase
          .from("bookings")
          .update({ google_event_id: googleId })
          .eq("id", bookingId)
          .eq("photographer_id", user.id);
      }

      for (const [eventId, googleId] of personalResults.entries()) {
        await supabase
          .from("personal_events")
          .update({ google_event_id: googleId })
          .eq("id", eventId)
          .eq("photographer_id", user.id);
      }
    } catch (e) {
      console.error("[GoogleSync] Bulk push failed:", e);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/calendar");
}

/**
 * Disconnects Google Calendar. If deleteEvents is true, removes all previously
 * synced events from Google Calendar before deleting the token.
 */
export async function disconnectGoogleCalendar(deleteEvents = false): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  if (deleteEvents) {
    const token = await getValidToken(supabase, user.id);
    if (token?.selected_calendar_id) {
      const [{ data: bookings }, { data: personalEvents }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, google_event_id")
          .eq("photographer_id", user.id)
          .not("google_event_id", "is", null),
        supabase
          .from("personal_events")
          .select("id, google_event_id")
          .eq("photographer_id", user.id)
          .not("google_event_id", "is", null),
      ]);

      await Promise.all([
        ...(bookings ?? []).map((b) =>
          deleteEvent(token.access_token, token.selected_calendar_id!, b.google_event_id!).catch(() => {})
        ),
        ...(personalEvents ?? []).map((e) =>
          deleteEvent(token.access_token, token.selected_calendar_id!, e.google_event_id!).catch(() => {})
        ),
      ]);

      await Promise.all([
        supabase.from("bookings").update({ google_event_id: null }).eq("photographer_id", user.id),
        supabase.from("personal_events").update({ google_event_id: null }).eq("photographer_id", user.id),
      ]);
    }
  }

  await supabase
    .from("google_calendar_tokens")
    .delete()
    .eq("photographer_id", user.id);

  revalidatePath("/settings");
}

/**
 * Lists the user's Google calendars (for the calendar picker).
 */
export async function listGoogleCalendars(): Promise<GoogleCalendarListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const token = await getValidToken(supabase, user.id);
  if (!token) throw new Error("Not connected to Google Calendar");

  return listCalendars(token.access_token);
}
