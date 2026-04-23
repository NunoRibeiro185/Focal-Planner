import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/queries/subscription";
import { cancelSubscription } from "@/lib/services/lemonsqueezy";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await getSubscription(supabase, user.id);
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    await cancelSubscription(subscription.lemon_squeezy_subscription_id);
    // Optimistic local update — webhook will confirm shortly
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("photographer_id", user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
