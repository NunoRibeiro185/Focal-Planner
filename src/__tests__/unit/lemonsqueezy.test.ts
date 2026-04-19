import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/services/lemonsqueezy";
import type { LemonSqueezyWebhookPayload } from "@/lib/services/lemonsqueezy";

// ─── Helpers ──────────────────────────────────────────────────

function makeSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makePayload(overrides: Partial<LemonSqueezyWebhookPayload["data"]["attributes"]> = {}): LemonSqueezyWebhookPayload {
  return {
    meta: {
      event_name: "subscription_created",
      custom_data: { photographer_id: "photo-abc" },
    },
    data: {
      id: "ls-sub-999",
      attributes: {
        customer_id: 42,
        status: "active",
        variant_id: 101,
        renews_at: "2026-09-01T00:00:00.000Z",
        ends_at: null,
        trial_ends_at: null,
        cancelled: false,
        ...overrides,
      },
    },
  };
}

// ─── verifyWebhookSignature ───────────────────────────────────

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ hello: "world" });

  it("returns true for a valid signature", () => {
    const sig = makeSignature(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("returns false when signature is for different body", () => {
    const sig = makeSignature("other body", secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it("returns false when secret is wrong", () => {
    const sig = makeSignature(body, "wrong-secret");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it("returns false for empty signature", () => {
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
  });

  it("returns false for tampered signature (one char off)", () => {
    const sig = makeSignature(body, secret);
    const tampered = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
    expect(verifyWebhookSignature(body, tampered, secret)).toBe(false);
  });

  it("is consistent — same inputs always produce the same result", () => {
    const sig = makeSignature(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });
});

// ─── parseWebhookPayload ──────────────────────────────────────

describe("parseWebhookPayload", () => {
  beforeEach(() => {
    vi.stubEnv("LEMONSQUEEZY_VARIANT_LAUNCH_MONTHLY", "101");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_LAUNCH_ANNUAL", "102");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_REGULAR_MONTHLY", "201");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_REGULAR_ANNUAL", "202");
  });

  it("parses a basic active monthly subscription", () => {
    const result = parseWebhookPayload(makePayload({ variant_id: 101 }));
    expect(result.photographerId).toBe("photo-abc");
    expect(result.lemonSqueezySubscriptionId).toBe("ls-sub-999");
    expect(result.lemonSqueezyCustomerId).toBe("42");
    expect(result.status).toBe("active");
    expect(result.plan).toBe("monthly");
    expect(result.priceLocked).toBe(true);
    expect(result.currentPeriodEnd).toBe("2026-09-01T00:00:00.000Z");
  });

  it("parses a launch annual subscription", () => {
    const result = parseWebhookPayload(makePayload({ variant_id: 102 }));
    expect(result.plan).toBe("annual");
    expect(result.priceLocked).toBe(true);
  });

  it("parses a regular monthly subscription (not price locked)", () => {
    const result = parseWebhookPayload(makePayload({ variant_id: 201 }));
    expect(result.plan).toBe("monthly");
    expect(result.priceLocked).toBe(false);
  });

  it("parses a regular annual subscription (not price locked)", () => {
    const result = parseWebhookPayload(makePayload({ variant_id: 202 }));
    expect(result.plan).toBe("annual");
    expect(result.priceLocked).toBe(false);
  });

  it("maps cancelled status correctly", () => {
    const result = parseWebhookPayload(makePayload({ status: "cancelled", cancelled: true }));
    expect(result.status).toBe("cancelled");
  });

  it("maps cancelled flag even when status is active", () => {
    const result = parseWebhookPayload(makePayload({ status: "active", cancelled: true }));
    expect(result.status).toBe("cancelled");
  });

  it("maps past_due status correctly", () => {
    const result = parseWebhookPayload(makePayload({ status: "past_due" }));
    expect(result.status).toBe("past_due");
  });

  it("maps paused status correctly", () => {
    const result = parseWebhookPayload(makePayload({ status: "paused" }));
    expect(result.status).toBe("paused");
  });

  it("maps expired LS status to cancelled", () => {
    const result = parseWebhookPayload(makePayload({ status: "expired" }));
    expect(result.status).toBe("cancelled");
  });

  it("maps unpaid LS status to past_due", () => {
    const result = parseWebhookPayload(makePayload({ status: "unpaid" }));
    expect(result.status).toBe("past_due");
  });

  it("uses ends_at when renews_at is null", () => {
    const result = parseWebhookPayload(
      makePayload({ renews_at: null, ends_at: "2026-10-01T00:00:00.000Z" })
    );
    expect(result.currentPeriodEnd).toBe("2026-10-01T00:00:00.000Z");
  });

  it("uses trial_ends_at as fallback when both renews_at and ends_at are null", () => {
    const result = parseWebhookPayload(
      makePayload({
        renews_at: null,
        ends_at: null,
        trial_ends_at: "2026-08-01T00:00:00.000Z",
      })
    );
    expect(result.currentPeriodEnd).toBe("2026-08-01T00:00:00.000Z");
  });

  it("throws when photographer_id is missing from custom_data", () => {
    const payload: LemonSqueezyWebhookPayload = {
      ...makePayload(),
      meta: { event_name: "subscription_created", custom_data: {} },
    };
    expect(() => parseWebhookPayload(payload)).toThrow("photographer_id");
  });

  it("throws when all period end dates are null", () => {
    expect(() =>
      parseWebhookPayload(
        makePayload({ renews_at: null, ends_at: null, trial_ends_at: null })
      )
    ).toThrow("period end");
  });
});
