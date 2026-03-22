import { describe, it, expect } from "vitest";
import { resolveBookingLayout } from "@/lib/utils/booking-layout";
import type { BookingStatus } from "@/lib/types";
import type { BookingPanel } from "@/lib/utils/booking-layout";

// ── resolveBookingLayout ──────────────────────────────────────────────────────

describe("resolveBookingLayout", () => {
  // ── editing layout ──────────────────────────────────────────────────────────

  it("includes editing_pipeline for editing status", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels).toContain("editing_pipeline");
  });

  it("editing_pipeline is the first panel in editing layout", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels[0]).toBe("editing_pipeline");
  });

  it("includes payment, extras, and tasks in editing layout", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels).toContain("payment");
    expect(panels).toContain("extras");
    expect(panels).toContain("tasks");
  });

  it("excludes package panel in editing layout", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels).not.toContain("package" satisfies BookingPanel);
  });

  it("excludes schedule panel in editing layout", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels).not.toContain("schedule" satisfies BookingPanel);
  });

  it("excludes itinerary panel in editing layout", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels).not.toContain("itinerary" satisfies BookingPanel);
  });

  it("excludes deliverables panel in editing layout", () => {
    const { panels } = resolveBookingLayout("editing");
    expect(panels).not.toContain("deliverables" satisfies BookingPanel);
  });

  // ── default layout (all non-editing statuses) ───────────────────────────────

  const defaultStatuses: BookingStatus[] = [
    "inquiry",
    "confirmed",
    "shoot_completed",
    "delivered",
    "done",
    "cancelled",
  ];

  for (const status of defaultStatuses) {
    it(`includes package, schedule, itinerary, payment, extras, tasks for "${status}"`, () => {
      const { panels } = resolveBookingLayout(status);
      expect(panels).toContain("package" satisfies BookingPanel);
      expect(panels).toContain("schedule" satisfies BookingPanel);
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
    });

    it(`does NOT include editing_pipeline for "${status}"`, () => {
      const { panels } = resolveBookingLayout(status);
      expect(panels).not.toContain("editing_pipeline" satisfies BookingPanel);
    });
  }
});
