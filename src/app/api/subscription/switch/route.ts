import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/queries/subscription";
import { switchSubscriptionVariant } from "@/lib/services/lemonsqueezy";
import type { SubscriptionPlan } from "@/lib/types/database";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let newPlan: SubscriptionPlan;
  try {
    const body = await req.json();
    if (body.plan !== "monthly" && body.plan !== "annual") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    newPlan = body.plan;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const subscription = await getSubscription(supabase, user.id);
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }
  if (subscription.plan === newPlan) {
    return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
  }

  try {
    await switchSubscriptionVariant(
      subscription.lemon_squeezy_subscription_id,
      newPlan,
      subscription.price_locked
    );
    // Optimistic local update — webhook will confirm shortly
    await supabase
      .from("subscriptions")
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq("photographer_id", user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
