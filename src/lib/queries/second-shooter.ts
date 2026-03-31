import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Booking, BookingItineraryStop, BookingTask, SecondShooterNote } from "@/lib/types";

// ─── Public view (used by both the public page and account-holder view) ───────

export interface SecondShooterView {
  booking: Pick<
    Booking,
    | "id"
    | "client_name_primary"
    | "client_name_secondary"
    | "client_email"
    | "client_phone"
    | "event_date"
    | "start_time"
    | "venue_name"
    | "venue_address"
    | "second_shooter_fee"
    | "second_shooter_instructions"
    | "second_shooter_show_client_contact"
  >;
  itineraryStops: BookingItineraryStop[];
}

/**
 * Returns the scoped booking data visible to a second shooter.
 * Uses the service-role client so it works for both unauthenticated
 * public-page visitors and authenticated account holders.
 *
 * Intentionally omits: total_price, deposit status, editing pipeline,
 * deliverables, and all other primary-photographer-only fields.
 */
export async function getSecondShooterView(
  bookingId: string
): Promise<SecondShooterView | null> {
  // Cast to any: Supabase TypeScript generics don't handle partial selects well
  const supabase = createServiceRoleClient() as any;

  const bookingResult = await supabase
    .from("bookings")
    .select(
      `
      id,
      client_name_primary,
      client_name_secondary,
      client_email,
      client_phone,
      event_date,
      start_time,
      venue_name,
      venue_address,
      second_shooter_fee,
      second_shooter_instructions,
      second_shooter_show_client_contact
      `
    )
    .eq("id", bookingId)
    .single() as { data: SecondShooterView["booking"] | null; error: unknown };

  if (bookingResult.error || !bookingResult.data) return null;

  const stopsResult = await supabase
    .from("booking_itinerary_stops")
    .select("*")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: true }) as { data: BookingItineraryStop[] | null };

  return {
    booking: bookingResult.data,
    itineraryStops: stopsResult.data ?? [],
  };
}

// ─── Account-holder: second shooter bookings list ────────────────────────────

export interface SecondShooterBookingListItem {
  id: string;
  client_name_primary: string;
  client_name_secondary: string | null;
  venue_name: string | null;
  event_date: string | null;
  second_shooter_fee: number | null;
  photographer_id: string;
}

/**
 * Returns bookings where the current authenticated user is an accepted
 * second shooter. RLS on the bookings table enforces the auth check.
 */
export async function getSecondShooterBookings(): Promise<SecondShooterBookingListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      client_name_primary,
      client_name_secondary,
      venue_name,
      event_date,
      second_shooter_fee,
      photographer_id
      `
    )
    .not("second_shooter_id", "is", null)
    .eq("second_shooter_invite_status", "accepted")
    .order("event_date", { ascending: true });

  if (error) throw error;

  // RLS already filters to rows where second_shooter_id = auth.uid(),
  // so the returned rows are exclusively second-shooter bookings.
  return (data ?? []) as SecondShooterBookingListItem[];
}

// ─── Pending invites ─────────────────────────────────────────────────────────

export interface PendingSecondShooterInvite {
  id: string;
  client_name_primary: string;
  client_name_secondary: string | null;
  event_date: string | null;
  venue_name: string | null;
  second_shooter_fee: number | null;
  photographer_full_name: string | null;
}

/**
 * Returns bookings where the current user has a pending second shooter invite.
 * Uses service-role because RLS only exposes accepted bookings to second shooters.
 * The userId is passed explicitly (resolved server-side from the auth session).
 */
export async function getPendingSecondShooterInvites(
  userId: string
): Promise<PendingSecondShooterInvite[]> {
  const supabase = createServiceRoleClient() as any;

  const { data } = await supabase
    .from("bookings")
    .select(
      `
      id,
      client_name_primary,
      client_name_secondary,
      event_date,
      venue_name,
      second_shooter_fee,
      photographer:photographers!photographer_id(full_name)
      `
    )
    .eq("second_shooter_id", userId)
    .eq("second_shooter_invite_status", "pending") as {
      data: Array<{
        id: string;
        client_name_primary: string;
        client_name_secondary: string | null;
        event_date: string | null;
        venue_name: string | null;
        second_shooter_fee: number | null;
        photographer: { full_name: string | null } | null;
      }> | null;
    };

  return (data ?? []).map((row) => ({
    id: row.id,
    client_name_primary: row.client_name_primary,
    client_name_secondary: row.client_name_secondary,
    event_date: row.event_date,
    venue_name: row.venue_name,
    second_shooter_fee: row.second_shooter_fee,
    photographer_full_name: row.photographer?.full_name ?? null,
  }));
}

// ─── Private notes ────────────────────────────────────────────────────────────

/**
 * Returns the second shooter's private notes for a booking.
 * Returns null if no notes row exists yet (first visit).
 */
export async function getSecondShooterNotes(
  bookingId: string
): Promise<SecondShooterNote | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("second_shooter_notes")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) throw error;
  return data as SecondShooterNote | null;
}
