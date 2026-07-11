import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/lib/utils/public-paths";

describe("isPublicPath", () => {
  // ── Public surfaces (must NOT require auth) ────────────────────────────────
  const publicPaths = [
    "/",
    "/login",
    "/auth/callback",
    "/api/webhooks/lemonsqueezy",
    "/inquiry/some-photographer/wedding",
    "/second-shooter/abc-123",
    "/client/booking-uuid", // client deal room — the Phase 0 regression
    "/client/booking-uuid?token=xyz",
  ];

  publicPaths.forEach((p) => {
    it(`treats ${p} as public`, () => {
      expect(isPublicPath(p)).toBe(true);
    });
  });

  // ── Authenticated app routes (MUST be gated) ───────────────────────────────
  const privatePaths = [
    "/command-center",
    "/bookings",
    "/bookings/123",
    "/calendar",
    "/settings",
    "/packages",
    "/expenses",
    "/insights",
    "/admin",
    "/pricing",
  ];

  privatePaths.forEach((p) => {
    it(`gates ${p}`, () => {
      expect(isPublicPath(p)).toBe(false);
    });
  });

  it("does not treat a path that merely contains a public segment as public", () => {
    // Guards against a `.includes` regression — only prefixes count.
    expect(isPublicPath("/bookings/client/123")).toBe(false);
    expect(isPublicPath("/app/login")).toBe(false);
  });
});
