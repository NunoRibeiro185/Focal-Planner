"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
} from "@/lib/services/second-shooter-access";
import { secondShooterPanelSchema, secondShooterPasswordSchema } from "@/lib/types/forms";
import type { SecondShooterPanelValues } from "@/lib/types/forms";
import { sendSecondShooterInvite } from "@/lib/services/resend";

const SESSION_COOKIE = "ss_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── Primary photographer actions ────────────────────────────────────────────

/**
 * Saves second shooter panel settings (email, fee, instructions, contact toggle).
 * Does NOT handle the password — use setSecondShooterPassword for that.
 */
export async function saveSecondShooterSettings(
  bookingId: string,
  values: SecondShooterPanelValues
): Promise<void> {
  const parsed = secondShooterPanelSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid second shooter settings");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({
      second_shooter_email: parsed.data.second_shooter_email || null,
      second_shooter_fee: parsed.data.second_shooter_fee,
      second_shooter_instructions: parsed.data.second_shooter_instructions || null,
      second_shooter_show_client_contact: parsed.data.second_shooter_show_client_contact,
    })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;
  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Hashes and stores a new public-page access password for the booking.
 */
export async function setSecondShooterPassword(
  bookingId: string,
  password: string
): Promise<void> {
  const parsed = secondShooterPasswordSchema.safeParse({ password });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid password");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const hash = await hashPassword(parsed.data.password);

  const { error } = await supabase
    .from("bookings")
    .update({ second_shooter_password_hash: hash })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;
  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Removes the public-page access password (revokes passwordless access).
 */
export async function removeSecondShooterPassword(bookingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({ second_shooter_password_hash: null })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;
  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Sends a Focal invite to a second shooter by email.
 * - If the email belongs to an existing Focal account: links second_shooter_id,
 *   sets status to 'pending', sends invite email with accept link.
 * - If no account found: stores the email for reference only (access via password page).
 *
 * Returns whether a Focal account was found.
 */
export async function inviteSecondShooter(
  bookingId: string,
  email: string
): Promise<{ foundAccount: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch the booking to confirm ownership and get primary photographer name
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, client_name_primary, client_name_secondary, event_date, photographer_id")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (bookingError || !booking) throw new Error("Booking not found");

  // Look up photographer by email using service-role (bypasses RLS on photographers)
  // Cast to any: Supabase TypeScript generics don't handle partial selects well
  const serviceClient = createServiceRoleClient() as any;
  const { data: secondShooter } = await serviceClient
    .from("photographers")
    .select("id, full_name, email")
    .eq("email", email)
    .maybeSingle() as { data: { id: string; full_name: string | null; email: string } | null };

  // Fetch the primary photographer's name for the email
  const { data: primaryPhotographer } = await serviceClient
    .from("photographers")
    .select("full_name, email")
    .eq("id", user.id)
    .single() as { data: { full_name: string | null; email: string } | null };

  const inviteToken = randomUUID();

  if (secondShooter) {
    // Account found — link and send invite
    const { error } = await supabase
      .from("bookings")
      .update({
        second_shooter_id: secondShooter.id,
        second_shooter_email: email,
        second_shooter_invite_token: inviteToken,
        second_shooter_invite_status: "pending",
      })
      .eq("id", bookingId)
      .eq("photographer_id", user.id);

    if (error) throw error;

    // Fire-and-forget invite email
    Promise.resolve().then(() =>
      sendSecondShooterInvite({
        toEmail: email,
        toName: secondShooter.full_name ?? email,
        fromName: primaryPhotographer?.full_name ?? "Your photographer",
        bookingId,
        clientName: [booking.client_name_primary, booking.client_name_secondary]
          .filter(Boolean)
          .join(" & "),
        eventDate: booking.event_date,
        inviteToken,
      })
    );

    revalidatePath(`/bookings/${bookingId}`);
    return { foundAccount: true };
  }

  // No account — store email for reference only
  const { error } = await supabase
    .from("bookings")
    .update({
      second_shooter_email: email,
      second_shooter_id: null,
      second_shooter_invite_token: null,
      second_shooter_invite_status: null,
    })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;
  revalidatePath(`/bookings/${bookingId}`);
  return { foundAccount: false };
}

/**
 * Removes the second shooter assignment from a booking entirely.
 */
export async function removeSecondShooter(bookingId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({
      second_shooter_id: null,
      second_shooter_email: null,
      second_shooter_fee: null,
      second_shooter_password_hash: null,
      second_shooter_instructions: null,
      second_shooter_invite_token: null,
      second_shooter_invite_status: null,
      second_shooter_show_client_contact: false,
    })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;
  revalidatePath(`/bookings/${bookingId}`);
}

// ─── Second shooter (account holder) actions ─────────────────────────────────

/**
 * Accepts a second shooter invite.
 * Validates the invite token and confirms the current user matches
 * the second_shooter_id on the booking.
 */
export async function acceptSecondShooterInvite(
  bookingId: string,
  inviteToken: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in to accept this invite." };

  // Use service-role to read the booking (user may not have SELECT access yet)
  const serviceClient = createServiceRoleClient() as any;
  const { data: booking, error: bookingError } = await serviceClient
    .from("bookings")
    .select("id, second_shooter_id, second_shooter_invite_token, second_shooter_invite_status")
    .eq("id", bookingId)
    .single() as {
      data: {
        id: string;
        second_shooter_id: string | null;
        second_shooter_invite_token: string | null;
        second_shooter_invite_status: string | null;
      } | null;
      error: unknown;
    };

  if (bookingError || !booking) return { success: false, error: "Invite not found." };
  if (booking.second_shooter_invite_status === "accepted") return { success: true };
  if (booking.second_shooter_id !== user.id) return { success: false, error: "This invite was not sent to your account." };
  if (booking.second_shooter_invite_token !== inviteToken) return { success: false, error: "Invalid or expired invite link." };

  const { error } = await (serviceClient as any)
    .from("bookings")
    .update({
      second_shooter_invite_status: "accepted",
      second_shooter_invite_token: null, // one-time use
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: "Failed to accept invite. Please try again." };

  revalidatePath("/bookings");
  return { success: true };
}

/**
 * Accepts a pending second shooter invite from within the app.
 * No invite token needed — the user's session proves their identity.
 */
export async function acceptPendingInviteInApp(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  // Use service role to verify and update (second shooter can't UPDATE via RLS)
  const serviceClient = createServiceRoleClient() as any;
  const { data: booking } = await serviceClient
    .from("bookings")
    .select("id, second_shooter_id, second_shooter_invite_status")
    .eq("id", bookingId)
    .single() as {
      data: {
        id: string;
        second_shooter_id: string | null;
        second_shooter_invite_status: string | null;
      } | null;
    };

  if (!booking) return { success: false, error: "Invite not found." };
  if (booking.second_shooter_id !== user.id) return { success: false, error: "This invite is not for your account." };
  if (booking.second_shooter_invite_status === "accepted") return { success: true };
  if (booking.second_shooter_invite_status !== "pending") return { success: false, error: "No pending invite found." };

  const { error } = await (serviceClient as any)
    .from("bookings")
    .update({
      second_shooter_invite_status: "accepted",
      second_shooter_invite_token: null,
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: "Failed to accept invite." };

  revalidatePath("/bookings");
  return { success: true };
}

/**
 * Saves the second shooter's private notes for a booking.
 * Uses upsert so the first save creates the row.
 */
export async function saveSecondShooterNotes(
  bookingId: string,
  notes: string | null
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("second_shooter_notes")
    .upsert(
      { booking_id: bookingId, photographer_id: user.id, notes: notes || null },
      { onConflict: "booking_id,photographer_id" }
    );

  if (error) throw error;
  revalidatePath(`/bookings/${bookingId}`);
}

// ─── Public page actions (unauthenticated) ───────────────────────────────────

/**
 * Verifies the password for the public second shooter page.
 * On success, sets a signed session cookie and returns { success: true }.
 */
export async function verifySecondShooterAccess(
  bookingId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const serviceClient = createServiceRoleClient() as any;

  const { data: booking } = await serviceClient
    .from("bookings")
    .select("second_shooter_password_hash")
    .eq("id", bookingId)
    .single() as { data: { second_shooter_password_hash: string | null } | null };

  if (!booking?.second_shooter_password_hash) {
    return { success: false, error: "Access not configured for this booking." };
  }

  const valid = await verifyPassword(password, booking.second_shooter_password_hash);
  if (!valid) return { success: false, error: "Incorrect password." };

  const token = createSessionToken(bookingId);
  const cookieStore = await cookies();
  cookieStore.set(`${SESSION_COOKIE}_${bookingId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: `/second-shooter/${bookingId}`,
  });

  return { success: true };
}
