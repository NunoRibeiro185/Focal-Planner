"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyTurnstileToken } from "@/lib/services/turnstile";
import {
  sendInquiryNotification,
  sendInquiryConfirmation,
} from "@/lib/services/resend";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  inquiryFormSchema,
  inquirySettingsSchema,
  type InquiryFormValues,
  type InquirySettingsValues,
} from "@/lib/types/forms";

// ─── Public: submit from the embeddable form ─────────────────

export interface SubmitInquiryResult {
  success: boolean;
  error?: string;
}

/**
 * Called from the public inquiry form (unauthenticated visitor).
 * Uses the service-role client so RLS does not block the insert.
 * Turnstile token is verified before any DB write.
 * Creates a booking with status = 'inquiry' directly.
 */
export async function submitInquiry(
  slug: string,
  values: InquiryFormValues
): Promise<SubmitInquiryResult> {
  const parsed = inquiryFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data." };
  }

  const captchaOk = await verifyTurnstileToken(parsed.data.turnstile_token);
  if (!captchaOk) {
    return { success: false, error: "CAPTCHA verification failed. Please try again." };
  }

  const supabase = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingId, error: rpcError } = await (supabase as any).rpc(
    "submit_inquiry_public",
    {
      p_slug:                  slug,
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
    }
  );

  if (rpcError) {
    const msg = rpcError.message ?? "";
    if (msg.includes("inquiry_form_not_found")) {
      return { success: false, error: "This inquiry form is no longer available." };
    }
    if (msg.includes("invalid_package")) {
      return { success: false, error: "Selected package is no longer available." };
    }
    console.error("submit_inquiry_public RPC error:", rpcError);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // Fire-and-forget emails
  Promise.all([
    supabase
      .from("bookings")
      .select("*, photographer:photographers(full_name, email)")
      .eq("id", bookingId as string)
      .single(),
  ]).then(([{ data }]) => {
    if (!data) return;
    const booking = data as any;
    const photographerName = booking.photographer?.full_name ?? "Your photographer";
    const photographerEmail = booking.photographer?.email;
    if (!photographerEmail) return;

    sendInquiryNotification({ booking, photographerName, photographerEmail });
    sendInquiryConfirmation({ booking, photographerName, photographerEmail });
  });

  return { success: true };
}

// ─── Authenticated: update inquiry form settings ─────────────

export async function updateInquirySettings(
  values: InquirySettingsValues
): Promise<{ success: boolean; error?: string }> {
  const parsed = inquirySettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Invalid settings." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const slugValue = parsed.data.slug.trim() === "" ? null : parsed.data.slug.trim();

  const { error } = await supabase
    .from("photographers")
    .update({
      slug:                        slugValue,
      inquiry_form_enabled:        parsed.data.inquiry_form_enabled,
      inquiry_show_packages:       parsed.data.inquiry_show_packages,
      inquiry_show_prices:         parsed.data.inquiry_show_prices,
      inquiry_show_phone:          parsed.data.inquiry_show_phone,
      inquiry_show_secondary_name: parsed.data.inquiry_show_secondary_name,
      inquiry_show_event_date:     parsed.data.inquiry_show_event_date,
      inquiry_show_venue:          parsed.data.inquiry_show_venue,
      inquiry_show_location:       parsed.data.inquiry_show_location,
      inquiry_show_notes:          parsed.data.inquiry_show_notes,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This URL slug is already taken. Please choose another." };
    }
    console.error("updateInquirySettings error:", error);
    return { success: false, error: "Failed to save settings." };
  }

  revalidatePath("/settings");
  return { success: true };
}
