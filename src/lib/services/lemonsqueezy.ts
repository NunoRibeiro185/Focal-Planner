import crypto from "crypto";
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

// ─── Helpers ──────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

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
  redirectUrl: string,
  now: Date = new Date()
): Promise<string> {
  const apiKey = getEnv("LEMONSQUEEZY_API_KEY");
  const storeId = getEnv("LEMONSQUEEZY_STORE_ID");
  const variantId = getVariantId(plan, now);

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email,
            custom: { photographer_id: photographerId },
          },
          product_options: {
            redirect_url: redirectUrl,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LemonSqueezy checkout error ${res.status}: ${body}`);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (!url) throw new Error("No checkout URL returned from LemonSqueezy");

  return url;
}

// ─── Subscription management ─────────────────────────────────

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const apiKey = getEnv("LEMONSQUEEZY_API_KEY");
  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LemonSqueezy cancel error ${res.status}: ${body}`);
  }
}

export async function switchSubscriptionVariant(
  subscriptionId: string,
  newPlan: SubscriptionPlan,
  priceLocked: boolean
): Promise<void> {
  const apiKey = getEnv("LEMONSQUEEZY_API_KEY");
  const variantId =
    newPlan === "monthly"
      ? priceLocked
        ? getEnv("LEMONSQUEEZY_VARIANT_LAUNCH_MONTHLY")
        : getEnv("LEMONSQUEEZY_VARIANT_REGULAR_MONTHLY")
      : priceLocked
      ? getEnv("LEMONSQUEEZY_VARIANT_LAUNCH_ANNUAL")
      : getEnv("LEMONSQUEEZY_VARIANT_REGULAR_ANNUAL");

  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: { variant_id: parseInt(variantId) },
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LemonSqueezy switch error ${res.status}: ${body}`);
  }
}

// ─── Webhook signature verification ──────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string = getEnv("LEMONSQUEEZY_WEBHOOK_SECRET")
): boolean {
  // An empty secret would make the HMAC forgeable — treat as unverifiable.
  if (!secret) return false;
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
  on_trial: "active",
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
