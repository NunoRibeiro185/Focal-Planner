"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyTurnstileToken } from "@/lib/services/turnstile";
import {
  sendInquiryNotification,
  sendInquiryConfirmation,
} from "@/lib/services/resend";
import { z } from "zod";

export interface SubmitInquiryResult {
  success: boolean;
  error?: string;
}

const submitSchema = z.object({
  client_name_primary: z.string().min(1),
  client_email: z.string().email(),
  client_name_secondary: z.string().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  event_date: z.string().nullable().optional(),
  venue_name: z.string().nullable().optional(),
  venue_address: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  package_template_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  turnstile_token: z.string().min(1),
  answers: z.array(z.object({
    question_text: z.string(),
    answer_value: z.string(),
    sort_order: z.number().int(),
  })).default([]),
});

export type SubmitInquiryValues = z.infer<typeof submitSchema>;

const urlSlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);

export async function submitInquiry(
  photographerUrl: string,
  formUrl: string,
  values: SubmitInquiryValues
): Promise<SubmitInquiryResult> {
  if (!urlSlugSchema.safeParse(photographerUrl).success || !urlSlugSchema.safeParse(formUrl).success) {
    return { success: false, error: "Invalid form URL." };
  }

  const parsed = submitSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: "Invalid form data." };

  const captchaOk = await verifyTurnstileToken(parsed.data.turnstile_token);
  if (!captchaOk) return { success: false, error: "CAPTCHA verification failed. Please try again." };

  const supabase = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingId, error: rpcError } = await (supabase as any).rpc(
    "submit_inquiry_public",
    {
      p_photographer_url:      photographerUrl,
      p_form_url:              formUrl,
      p_client_name_primary:   parsed.data.client_name_primary,
      p_client_email:          parsed.data.client_email,
      p_client_name_secondary: parsed.data.client_name_secondary ?? null,
      p_client_phone:          parsed.data.client_phone ?? null,
      p_event_date:            parsed.data.event_date ?? null,
      p_venue_name:            parsed.data.venue_name ?? null,
      p_venue_address:         parsed.data.venue_address ?? null,
      p_location:              parsed.data.location ?? null,
      p_package_template_id:   parsed.data.package_template_id ?? null,
      p_notes:                 parsed.data.notes ?? null,
      p_answers:               JSON.stringify(parsed.data.answers),
    }
  );

  if (rpcError) {
    const msg = rpcError.message ?? "";
    if (msg.includes("inquiry_form_not_found")) return { success: false, error: "This inquiry form is no longer available." };
    if (msg.includes("invalid_package")) return { success: false, error: "Selected package is no longer available." };
    console.error("submit_inquiry_public RPC error:", rpcError);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  Promise.all([
    supabase
      .from("bookings")
      .select("*, photographer:photographers(full_name, email)")
      .eq("id", bookingId as string)
      .single(),
  ]).then(([{ data, error }]) => {
    if (error) { console.error("Failed to load booking for email dispatch:", error); return; }
    if (!data) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = data as any;
    const photographerName = booking.photographer?.full_name ?? "Your photographer";
    const photographerEmail = booking.photographer?.email;
    if (!photographerEmail) return;
    const formName = booking.inquiry_form_name_snapshot ?? undefined;
    sendInquiryNotification({ booking, photographerName, photographerEmail, formName });
    sendInquiryConfirmation({ booking, photographerName, photographerEmail });
  }).catch((err) => {
    console.error("Failed to fetch booking for email notification:", err);
  });

  return { success: true };
}
