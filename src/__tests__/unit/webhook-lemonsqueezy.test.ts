import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Mock Supabase service-role client ────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
}));

// Must import route AFTER mocks are set up
import { POST } from "@/app/api/webhooks/lemonsqueezy/route";

// ─── Helpers ──────────────────────────────────────────────────

const WEBHOOK_SECRET = "test-secret";

function sign(body: string): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

function makeRequest(body: string, signature?: string): Request {
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature ?? sign(body),
    },
    body,
  });
}

function makeSubscriptionPayload(eventName = "subscription_created") {
  return JSON.stringify({
    meta: {
      event_name: eventName,
      custom_data: { photographer_id: "photo-123" },
    },
    data: {
      id: "ls-sub-1",
      attributes: {
        customer_id: 99,
        status: "active",
        variant_id: 201,
        renews_at: "2026-09-01T00:00:00.000Z",
        ends_at: null,
        trial_ends_at: null,
        cancelled: false,
      },
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────

describe("POST /api/webhooks/lemonsqueezy", () => {
  beforeEach(() => {
    vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("LEMONSQUEEZY_VARIANT_LAUNCH_MONTHLY", "101");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_LAUNCH_ANNUAL", "102");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_REGULAR_MONTHLY", "201");
    vi.stubEnv("LEMONSQUEEZY_VARIANT_REGULAR_ANNUAL", "202");
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockClear();
    mockUpsert.mockClear();
  });

  it("returns 401 for invalid signature", async () => {
    const body = makeSubscriptionPayload();
    const res = await POST(makeRequest(body, "bad-signature") as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 for missing signature", async () => {
    const body = makeSubscriptionPayload();
    const req = new Request("http://localhost/api/webhooks/lemonsqueezy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const body = "not-json";
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 and skips DB for unknown event types", async () => {
    const body = JSON.stringify({
      meta: { event_name: "order_created" },
      data: { id: "x", attributes: {} },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 200 and upserts subscription on subscription_created", async () => {
    const body = makeSubscriptionPayload("subscription_created");
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    expect(mockUpsert).toHaveBeenCalledOnce();
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.photographer_id).toBe("photo-123");
    expect(upsertArg.status).toBe("active");
  });

  it("returns 200 and upserts subscription on subscription_updated", async () => {
    const body = makeSubscriptionPayload("subscription_updated");
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("returns 200 and upserts subscription on subscription_cancelled", async () => {
    const body = JSON.stringify({
      meta: { event_name: "subscription_cancelled", custom_data: { photographer_id: "photo-123" } },
      data: {
        id: "ls-sub-1",
        attributes: {
          customer_id: 99,
          status: "cancelled",
          variant_id: 201,
          renews_at: null,
          ends_at: "2026-09-30T00:00:00.000Z",
          trial_ends_at: null,
          cancelled: true,
        },
      },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(200);
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.status).toBe("cancelled");
  });

  it("is idempotent — duplicate events upsert without error", async () => {
    const body = makeSubscriptionPayload("subscription_created");
    const req1 = makeRequest(body);
    const req2 = makeRequest(body);
    const [res1, res2] = await Promise.all([POST(req1 as never), POST(req2 as never)]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when Supabase upsert fails", async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: "DB error" } });
    const body = makeSubscriptionPayload();
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(500);
  });

  it("returns 400 when photographer_id is missing from payload", async () => {
    const body = JSON.stringify({
      meta: { event_name: "subscription_created", custom_data: {} },
      data: {
        id: "ls-sub-1",
        attributes: {
          customer_id: 99,
          status: "active",
          variant_id: 201,
          renews_at: "2026-09-01T00:00:00.000Z",
          ends_at: null,
          trial_ends_at: null,
          cancelled: false,
        },
      },
    });
    const res = await POST(makeRequest(body) as never);
    expect(res.status).toBe(400);
  });
});
