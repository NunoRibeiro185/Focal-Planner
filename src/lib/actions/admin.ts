"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isAdminEmail } from "@/lib/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Unauthorized");
  }
}

export async function grantPro(photographerId: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("subscriptions") as any).upsert(
    {
      photographer_id: photographerId,
      lemon_squeezy_subscription_id: `admin_grant_${photographerId}`,
      lemon_squeezy_customer_id: `admin_grant_${photographerId}`,
      status: "active",
      plan: "annual",
      price_locked: false,
      current_period_end: "2099-12-31T23:59:59.000Z",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "photographer_id" }
  );
}

export async function revokePro(photographerId: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase.from("subscriptions") as any)
    .select("lemon_squeezy_subscription_id")
    .eq("photographer_id", photographerId)
    .maybeSingle();

  if (!sub) return;

  if ((sub.lemon_squeezy_subscription_id as string).startsWith("admin_grant_")) {
    // Admin-granted — delete the row to return to free
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("subscriptions") as any).delete().eq("photographer_id", photographerId);
  } else {
    // Real paid subscription — just mark cancelled (don't touch LemonSqueezy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("subscriptions") as any)
      .update({ status: "cancelled" })
      .eq("photographer_id", photographerId);
  }
}
