/**
 * Google Calendar Service
 *
 * Encapsulates all Google Calendar API interaction behind a simple interface.
 * Callers never deal with raw Google API errors — all errors surface as typed results.
 * Token refresh is handled transparently before every API call.
 */

import type { CalendarEvent } from "@/lib/types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function getClientId() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID env var is not set");
  return id;
}

function getClientSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET env var is not set");
  return secret;
}

function getRedirectUri() {
  const uri = process.env.GOOGLE_REDIRECT_URI;
  if (!uri) throw new Error("GOOGLE_REDIRECT_URI env var is not set");
  return uri;
}

// ─── OAuth ───────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expiry_date: Date;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${body}`);
  }

  const json = await res.json();
  const expiry = new Date(Date.now() + json.expires_in * 1000);

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    expiry_date: expiry,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expiry_date: Date }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${body}`);
  }

  const json = await res.json();
  return {
    access_token: json.access_token,
    expiry_date: new Date(Date.now() + json.expires_in * 1000),
  };
}

// ─── Calendar list ───────────────────────────────────────────

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
}

export async function listCalendars(
  accessToken: string
): Promise<GoogleCalendarListItem[]> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/users/me/calendarList?minAccessRole=writer`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`listCalendars failed: ${body}`);
  }

  const json = await res.json();
  return (json.items ?? []).map((item: any) => ({
    id: item.id,
    summary: item.summary,
  }));
}

// ─── Event mapping ───────────────────────────────────────────

function buildGoogleEventBodyFull(
  event: CalendarEvent,
  startTime?: string | null,
  endTime?: string | null
): object {
  const baseTitle =
    event.kind === "booking"
      ? `📷 ${event.clientName}`
      : event.title;

  const description =
    event.kind === "booking"
      ? [
          event.venueName ? `Venue: ${event.venueName}` : null,
          `Status: ${event.status}`,
          `Total: ${event.currency} ${event.totalPrice}`,
        ]
          .filter(Boolean)
          .join("\n")
      : [event.tag ? `Tag: ${event.tag}` : null]
          .filter(Boolean)
          .join("\n");

  if (event.allDay) {
    return {
      summary: baseTitle,
      description: description || undefined,
      start: { date: event.start },
      end: { date: event.end },
    };
  }

  const resolvedStart = startTime ?? "09:00:00";
  const resolvedEnd = endTime ?? "10:00:00";

  return {
    summary: baseTitle,
    description: description || undefined,
    start: { dateTime: `${event.start}T${resolvedStart}`, timeZone: "UTC" },
    end: { dateTime: `${event.end}T${resolvedEnd}`, timeZone: "UTC" },
  };
}

// ─── CRUD operations ─────────────────────────────────────────

/**
 * Pushes a new event to Google Calendar. Returns the Google event ID.
 */
export async function pushEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent,
  startTime?: string | null,
  endTime?: string | null
): Promise<string> {
  const body = buildGoogleEventBodyFull(event, startTime, endTime);

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pushEvent failed: ${text}`);
  }

  const json = await res.json();
  return json.id as string;
}

/**
 * Updates an existing Google Calendar event.
 */
export async function updateEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  event: CalendarEvent,
  startTime?: string | null,
  endTime?: string | null
): Promise<void> {
  const body = buildGoogleEventBodyFull(event, startTime, endTime);

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateEvent failed: ${text}`);
  }
}

/**
 * Deletes an event from Google Calendar.
 */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 404 = already gone, 410 = gone — both are acceptable
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text();
    throw new Error(`deleteEvent failed: ${text}`);
  }
}

/**
 * Bulk-pushes multiple events. Returns a map of localId → googleEventId.
 */
export async function bulkPushEvents(
  accessToken: string,
  calendarId: string,
  events: Array<{ event: CalendarEvent; localId: string; startTime?: string | null; endTime?: string | null }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const { event, localId, startTime, endTime } of events) {
    try {
      const googleId = await pushEvent(accessToken, calendarId, event, startTime, endTime);
      results.set(localId, googleId);
    } catch (e) {
      console.error(`[GoogleSync] bulkPush failed for ${localId}:`, e);
    }
  }

  return results;
}
