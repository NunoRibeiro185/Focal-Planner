import { Resend } from "resend";

/**
 * Deal room email functions.
 *
 * All functions are fire-and-forget: errors are logged but never thrown,
 * so a failed email never blocks the deal room action from completing.
 */

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set — emails will not be sent");
    return null;
  }
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_ADDRESS ?? "noreply@focalplanner.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://focalplanner.com";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function dealRoomUrl(bookingId: string, token: string): string {
  return `${APP_URL}/client/${bookingId}?token=${token}`;
}

export async function sendDealRoomLinkEmail(params: {
  clientEmail: string;
  clientName: string;
  photographerName: string;
  bookingId: string;
  clientToken: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const url = dealRoomUrl(params.bookingId, params.clientToken);
  try {
    await client.emails.send({
      from: FROM,
      to: params.clientEmail,
      subject: `Your booking page with ${params.photographerName}`,
      html: `<p>Hi ${esc(params.clientName)},</p>
<p>Thank you for your inquiry! You can track your booking here:</p>
<p><a href="${url}">View your booking page</a></p>
<p>${esc(params.photographerName)}</p>`,
    });
  } catch (err) {
    console.error("Failed to send deal room link email:", err);
  }
}

export async function sendProposalEmail(params: {
  clientEmail: string;
  clientName: string;
  photographerName: string;
  bookingId: string;
  clientToken: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const url = dealRoomUrl(params.bookingId, params.clientToken);
  try {
    await client.emails.send({
      from: FROM,
      to: params.clientEmail,
      subject: `You have a new proposal from ${params.photographerName}`,
      html: `<p>Hi ${esc(params.clientName)},</p>
<p>${esc(params.photographerName)} has sent you a proposal. Review it and let them know:</p>
<p><a href="${url}">View proposal</a></p>`,
    });
  } catch (err) {
    console.error("Failed to send proposal email:", err);
  }
}

export async function sendProposalAcceptedEmail(params: {
  photographerEmail: string;
  clientName: string;
  bookingId: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.emails.send({
      from: FROM,
      to: params.photographerEmail,
      subject: `${params.clientName} accepted your proposal`,
      html: `<p>${esc(params.clientName)} accepted your proposal for booking ${params.bookingId}.</p>`,
    });
  } catch (err) {
    console.error("Failed to send proposal accepted email:", err);
  }
}

export async function sendCounterOfferEmail(params: {
  photographerEmail: string;
  clientName: string;
  bookingId: string;
  removedItems: string[];
  proposedTotal: number;
  currency: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const removed = params.removedItems.join(", ");
  try {
    await client.emails.send({
      from: FROM,
      to: params.photographerEmail,
      subject: `${params.clientName} sent a counter-offer`,
      html: `<p>${esc(params.clientName)} sent a counter-offer for booking ${params.bookingId}.</p>
<p><strong>Removed:</strong> ${removed}</p>
<p><strong>Proposed total:</strong> ${params.currency}${params.proposedTotal.toFixed(2)}</p>`,
    });
  } catch (err) {
    console.error("Failed to send counter-offer email:", err);
  }
}

export async function sendItineraryUpdatedEmail(params: {
  photographerEmail: string;
  clientName: string;
  bookingId: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.emails.send({
      from: FROM,
      to: params.photographerEmail,
      subject: `${params.clientName} updated the itinerary`,
      html: `<p>${esc(params.clientName)} added a stop to the itinerary for booking ${params.bookingId}.</p>`,
    });
  } catch (err) {
    console.error("Failed to send itinerary updated email:", err);
  }
}

export async function sendChangeRequestEmail(params: {
  clientEmail: string;
  clientName: string;
  photographerName: string;
  bookingId: string;
  clientToken: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  const url = dealRoomUrl(params.bookingId, params.clientToken);
  try {
    await client.emails.send({
      from: FROM,
      to: params.clientEmail,
      subject: `${params.photographerName} proposed changes to your booking`,
      html: `<p>Hi ${esc(params.clientName)},</p>
<p>${esc(params.photographerName)} has proposed some changes to your booking. Please review and agree to continue:</p>
<p><a href="${url}">Review changes</a></p>`,
    });
  } catch (err) {
    console.error("Failed to send change request email:", err);
  }
}

export async function sendAnswersSubmittedEmail(params: {
  photographerEmail: string;
  clientName: string;
  bookingId: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.emails.send({
      from: FROM,
      to: params.photographerEmail,
      subject: `${params.clientName} answered your questions`,
      html: `<p>${esc(params.clientName)} answered or updated their responses for booking ${params.bookingId}.</p>`,
    });
  } catch (err) {
    console.error("Failed to send answers submitted email:", err);
  }
}
