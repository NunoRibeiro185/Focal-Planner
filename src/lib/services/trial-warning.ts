import { isInTrialWarningWindow } from "@/lib/services/entitlements";
import { sendTrialWarningEmail } from "@/lib/services/resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Photographer } from "@/lib/types/database";

/**
 * Sends the one-time 7-day trial warning email to a photographer if:
 * 1. We are inside the trial warning window
 * 2. The email hasn't been sent yet (trial_warning_sent_at is null)
 *
 * Call this on each authenticated page load — it's cheap (single DB read)
 * and self-deduplicates via the trial_warning_sent_at flag.
 */
export async function maybeDispatchTrialWarning(
  photographer: Pick<Photographer, "id" | "email" | "full_name" | "trial_warning_sent_at">,
  now: Date = new Date()
): Promise<void> {
  if (!isInTrialWarningWindow(now)) return;
  if (photographer.trial_warning_sent_at !== null) return;

  const supabase = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("photographers") as any)
    .update({ trial_warning_sent_at: now.toISOString() })
    .eq("id", photographer.id);

  if (error) {
    console.error("Failed to mark trial warning sent:", error);
    return;
  }

  await sendTrialWarningEmail(photographer.email, photographer.full_name);
}
