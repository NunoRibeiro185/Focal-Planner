import { Resend } from "resend";

/**
 * Resend email service for inquiry notifications.
 *
 * Both functions are fire-and-forget: errors are logged but never thrown,
 * so a failed email never blocks the booking from being saved.
 */

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set — emails will not be sent");
    return null;
  }
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_ADDRESS ?? "noreply@focal.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://focal.app";

export interface InquiryEmailPayload {
  booking: {
    id: string;
    client_name_primary: string;
    client_name_secondary: string | null;
    client_email: string | null;
    client_phone: string | null;
    event_date: string | null;
    venue_name: string | null;
    notes: string | null;
  };
  photographerName: string;
  photographerEmail: string;
}

/** Notifies the photographer that a new inquiry was submitted. */
export async function sendInquiryNotification(
  payload: InquiryEmailPayload
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { booking, photographerName, photographerEmail } = payload;
  const clientName = [booking.client_name_primary, booking.client_name_secondary]
    .filter(Boolean)
    .join(" & ");

  const detailUrl = `${APP_URL}/bookings/${booking.id}`;

  const html = `
    <h2>New inquiry from ${clientName}</h2>
    <p>You received a new inquiry through your Focal Planner form.</p>
    <table cellpadding="4" style="font-family:sans-serif;font-size:14px;">
      <tr><td><strong>Name</strong></td><td>${clientName}</td></tr>
      <tr><td><strong>Email</strong></td><td>${booking.client_email ?? "—"}</td></tr>
      ${booking.client_phone ? `<tr><td><strong>Phone</strong></td><td>${booking.client_phone}</td></tr>` : ""}
      ${booking.event_date ? `<tr><td><strong>Event date</strong></td><td>${booking.event_date}</td></tr>` : ""}
      ${booking.venue_name ? `<tr><td><strong>Venue</strong></td><td>${booking.venue_name}</td></tr>` : ""}
      ${booking.notes ? `<tr><td><strong>Notes</strong></td><td>${booking.notes}</td></tr>` : ""}
    </table>
    <p><a href="${detailUrl}">View inquiry in Focal Planner →</a></p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: photographerEmail,
      subject: `New inquiry from ${clientName}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send inquiry notification email:", err);
  }
}

// ─── Second shooter invite ────────────────────────────────────

export interface SecondShooterInvitePayload {
  toEmail: string;
  toName: string;
  fromName: string;
  bookingId: string;
  clientName: string;
  eventDate: string | null;
  inviteToken: string;
}

/** Sends an invite email to a second shooter with a Focal account. */
export async function sendSecondShooterInvite(
  payload: SecondShooterInvitePayload
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { toEmail, toName, fromName, bookingId, clientName, eventDate, inviteToken } = payload;
  const acceptUrl = `${APP_URL}/second-shooter/accept/${bookingId}?token=${inviteToken}`;

  const html = `
    <h2>You've been invited as a second shooter</h2>
    <p>Hi ${toName},</p>
    <p>
      <strong>${fromName}</strong> has invited you to join them as a second shooter
      for the <strong>${clientName}</strong> booking${eventDate ? ` on <strong>${eventDate}</strong>` : ""}.
    </p>
    <p>
      <a href="${acceptUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
        Accept invite →
      </a>
    </p>
    <p style="color:#666;font-size:12px;">
      This link can only be used once. If you did not expect this invite, you can ignore this email.
    </p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: toEmail,
      subject: `Second shooter invite from ${fromName} — ${clientName}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send second shooter invite email:", err);
  }
}

// ─── Trial warning ────────────────────────────────────────────

/** Sends the one-time trial expiry warning email to a photographer. Fire-and-forget. */
export async function sendTrialWarningEmail(
  photographerEmail: string,
  photographerName: string | null
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const name = photographerName ?? "there";
  const pricingUrl = `${APP_URL}/pricing`;
  const expiryDate = "31 July 2026";

  const html = `
    <h2>Your Focal Planner trial ends on ${expiryDate}</h2>
    <p>Hi ${name},</p>
    <p>
      Your free trial of Focal Planner Pro ends in <strong>7 days</strong> on <strong>${expiryDate}</strong>.
      After that, you'll move to the free tier and lose access to Pro features like
      Google Calendar sync, Insights, Inquiry Forms, and Second Shooter collaboration.
    </p>
    <p>
      <strong>Subscribe now to lock in our launch price of €10/month</strong> — this rate
      is guaranteed forever for early subscribers.
    </p>
    <p>
      <a href="${pricingUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
        Upgrade to Pro →
      </a>
    </p>
    <p style="color:#666;font-size:12px;">
      If you choose not to subscribe, your account will continue on the free tier and all your existing data will remain accessible.
    </p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: photographerEmail,
      subject: "Your Focal Planner trial ends in 7 days — lock in €10/month",
      html,
    });
  } catch (err) {
    console.error("Failed to send trial warning email:", err);
  }
}

/** Sends an auto-reply confirmation to the client. */
export async function sendInquiryConfirmation(
  payload: InquiryEmailPayload
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { booking, photographerName } = payload;
  if (!booking.client_email) return;

  const html = `
    <h2>Thanks for reaching out, ${booking.client_name_primary}!</h2>
    <p>
      ${photographerName} has received your inquiry and will be in touch with you shortly.
    </p>
    <p style="color:#666;font-size:12px;">
      This is an automated confirmation. Please do not reply to this email.
    </p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: booking.client_email,
      subject: `Your inquiry to ${photographerName} — we got it!`,
      html,
    });
  } catch (err) {
    console.error("Failed to send inquiry confirmation email:", err);
  }
}
