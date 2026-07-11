import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/services/lemonsqueezy";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_payment_failed",
]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  // Fail closed: HMAC with an empty/missing secret is forgeable, which would
  // let anyone mint themselves an active subscription.
  if (!secret) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET is not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = (payload as { meta?: { event_name?: string } }).meta?.event_name;

  if (!eventName || !HANDLED_EVENTS.has(eventName)) {
    return NextResponse.json({ received: true });
  }

  let syncData;
  try {
    syncData = parseWebhookPayload(payload as Parameters<typeof parseWebhookPayload>[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("subscriptions") as any).upsert(
    {
      photographer_id: syncData.photographerId,
      lemon_squeezy_subscription_id: syncData.lemonSqueezySubscriptionId,
      lemon_squeezy_customer_id: syncData.lemonSqueezyCustomerId,
      status: syncData.status,
      plan: syncData.plan,
      price_locked: syncData.priceLocked,
      current_period_end: syncData.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "photographer_id" }
  );

  if (error) {
    console.error("Subscription upsert failed:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
