import crypto from "crypto";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";
import { LAUNCH_WINDOW } from "@/config/plans";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

// ─── Types ────────────────────────────────────────────────────

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: {
      photographer_id?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      customer_id: number;
      status: string;
      variant_id: number;
      renews_at: string | null;
      ends_at: string | null;
      trial_ends_at: string | null;
      cancelled: boolean;
    };
  };
}

export interface SubscriptionSyncData {
  photographerId: string;
  lemonSqueezySubscriptionId: string;
  lemonSqueezyCustomerId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  priceLocked: boolean;
  currentPeriodEnd: string;
}

// ─── Setup ────────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

function setup() {
  lemonSqueezySetup({ apiKey: getEnv("LEMONSQUEEZY_API_KEY") });
}

// ─── Variant resolution ───────────────────────────────────────

function isLaunchPeriod(now: Date = new Date()): boolean {
  return now >= LAUNCH_WINDOW.start && now <= LAUNCH_WINDOW.end;
}

function getVariantId(plan: SubscriptionPlan, now: Date = new Date()): string {
  const launch = isLaunchPeriod(now);
  if (plan === "monthly") {
    return launch
      ? getEnv("LEMONSQUEEZY_VARIANT_LAUNCH_MONTHLY")
      : getEnv("LEMONSQUEEZY_VARIANT_REGULAR_MONTHLY");
  }
  return launch
    ? getEnv("LEMONSQUEEZY_VARIANT_LAUNCH_ANNUAL")
    : getEnv("LEMONSQUEEZY_VARIANT_REGULAR_ANNUAL");
}

// ─── Checkout ─────────────────────────────────────────────────

export async function createCheckoutSession(
  photographerId: string,
  email: string,
  plan: SubscriptionPlan,
  now: Date = new Date()
): Promise<string> {
  setup();
  const storeId = getEnv("LEMONSQUEEZY_STORE_ID");
  const variantId = getVariantId(plan, now);

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutData: {
      email,
      custom: { photographer_id: photographerId },
    },
    checkoutOptions: {
      embed: false,
    },
  });

  if (error) throw new Error(`LemonSqueezy checkout error: ${error.message}`);
  if (!data?.data?.attributes?.url) throw new Error("No checkout URL returned");

  return data.data.attributes.url;
}

// ─── Webhook signature verification ──────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string = getEnv("LEMONSQUEEZY_WEBHOOK_SECRET")
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Webhook payload parsing ──────────────────────────────────

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  cancelled: "cancelled",
  past_due: "past_due",
  paused: "paused",
  expired: "cancelled",
  unpaid: "past_due",
};

export function parseWebhookPayload(
  payload: LemonSqueezyWebhookPayload
): SubscriptionSyncData {
  const { meta, data } = payload;
  const attrs = data.attributes;

  const photographerId = meta.custom_data?.photographer_id;
  if (!photographerId) throw new Error("Webhook payload missing photographer_id in custom_data");

  const rawStatus = attrs.cancelled ? "cancelled" : attrs.status;
  const status: SubscriptionStatus = STATUS_MAP[rawStatus] ?? "cancelled";

  const variantId = String(attrs.variant_id);

  const launchVariantIds = new Set(
    [
      process.env.LEMONSQUEEZY_VARIANT_LAUNCH_MONTHLY,
      process.env.LEMONSQUEEZY_VARIANT_LAUNCH_ANNUAL,
    ].filter(Boolean)
  );
  const annualVariantIds = new Set(
    [
      process.env.LEMONSQUEEZY_VARIANT_LAUNCH_ANNUAL,
      process.env.LEMONSQUEEZY_VARIANT_REGULAR_ANNUAL,
    ].filter(Boolean)
  );

  const plan: SubscriptionPlan = annualVariantIds.has(variantId) ? "annual" : "monthly";
  const priceLocked = launchVariantIds.has(variantId);

  const currentPeriodEnd = attrs.renews_at ?? attrs.ends_at ?? attrs.trial_ends_at;
  if (!currentPeriodEnd) throw new Error("Webhook payload missing period end date");

  return {
    photographerId,
    lemonSqueezySubscriptionId: data.id,
    lemonSqueezyCustomerId: String(attrs.customer_id),
    status,
    plan,
    priceLocked,
    currentPeriodEnd,
  };
}
