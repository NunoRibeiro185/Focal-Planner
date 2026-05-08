import { describe, it, expect } from "vitest";
import {
  resolveBookingLayout,
  getAllPanels,
  isForceShown,
} from "@/lib/utils/booking-layout";
import type { BookingStatus } from "@/lib/types";
import type { BookingPanel } from "@/lib/utils/booking-layout";

// ── resolveBookingLayout ──────────────────────────────────────────────────────

describe("resolveBookingLayout", () => {
  const allStatuses: BookingStatus[] = [
    "inquiry",
    "confirmed",
    "shoot_completed",
    "editing",
    "delivered",
    "done",
    "cancelled",
  ];

  // ── schedule panel removed from all layouts ──────────────────────────────

  for (const status of allStatuses) {
    it(`does not include the legacy schedule panel for "${status}"`, () => {
      expect(getAllPanels(resolveBookingLayout(status))).not.toContain("schedule");
    });
  }

  // ── editing_pipeline: only in editing ────────────────────────────────────

  it("includes editing_pipeline for editing status", () => {
    expect(getAllPanels(resolveBookingLayout("editing"))).toContain(
      "editing_pipeline" satisfies BookingPanel
    );
  });

  it("editing_pipeline is in the first section for editing layout", () => {
    const layout = resolveBookingLayout("editing");
    const firstSectionPanels = layout.sections[0].slots.map((s) => s.panel);
    expect(firstSectionPanels).toContain("editing_pipeline" satisfies BookingPanel);
  });

  for (const status of allStatuses.filter((s) => s !== "editing")) {
    it(`does not include editing_pipeline for "${status}"`, () => {
      expect(getAllPanels(resolveBookingLayout(status))).not.toContain(
        "editing_pipeline" satisfies BookingPanel
      );
    });
  }

  // ── availability_calendar: only in inquiry and confirmed ─────────────────

  it("includes availability_calendar for inquiry", () => {
    expect(getAllPanels(resolveBookingLayout("inquiry"))).toContain(
      "availability_calendar" satisfies BookingPanel
    );
  });

  it("includes availability_calendar for confirmed", () => {
    expect(getAllPanels(resolveBookingLayout("confirmed"))).toContain(
      "availability_calendar" satisfies BookingPanel
    );
  });

  for (const status of allStatuses.filter(
    (s) => s !== "inquiry" && s !== "confirmed"
  )) {
    it(`does not include availability_calendar for "${status}"`, () => {
      expect(getAllPanels(resolveBookingLayout(status))).not.toContain(
        "availability_calendar" satisfies BookingPanel
      );
    });
  }

  // ── notes panel: present in all statuses ─────────────────────────────────

  for (const status of allStatuses) {
    it(`includes notes panel for "${status}"`, () => {
      expect(getAllPanels(resolveBookingLayout(status))).toContain(
        "notes" satisfies BookingPanel
      );
    });
  }

  it("forces notes to always show for inquiry", () => {
    expect(isForceShown(resolveBookingLayout("inquiry"), "notes")).toBe(true);
  });

  it("forces notes to always show for confirmed", () => {
    expect(isForceShown(resolveBookingLayout("confirmed"), "notes")).toBe(true);
  });

  for (const status of allStatuses.filter(
    (s) => s !== "inquiry" && s !== "confirmed"
  )) {
    it(`does not force-show notes for "${status}"`, () => {
      expect(isForceShown(resolveBookingLayout(status), "notes")).toBe(false);
    });
  }

  // ── inquiry layout ────────────────────────────────────────────────────────

  describe("inquiry layout", () => {
    it("includes client_info, package_extras, itinerary, payment, tasks", () => {
      const panels = getAllPanels(resolveBookingLayout("inquiry"));
      expect(panels).toContain("client_info" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
      expect(panels).toContain("itinerary" satisfies BookingPanel);
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
    });

    it("does not include deliverables", () => {
      expect(getAllPanels(resolveBookingLayout("inquiry"))).not.toContain(
        "deliverables" satisfies BookingPanel
      );
    });
  });

  // ── confirmed layout ──────────────────────────────────────────────────────

  describe("confirmed layout", () => {
    it("includes client_info, itinerary, package_extras, payment, tasks", () => {
      const panels = getAllPanels(resolveBookingLayout("confirmed"));
      expect(panels).toContain("client_info" satisfies BookingPanel);
      expect(panels).toContain("itinerary" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
    });

    it("does not include deliverables", () => {
      expect(getAllPanels(resolveBookingLayout("confirmed"))).not.toContain(
        "deliverables" satisfies BookingPanel
      );
    });
  });

  // ── shoot_completed layout ────────────────────────────────────────────────

  describe("shoot_completed layout", () => {
    it("includes tasks, payment, client_info, package_extras", () => {
      const panels = getAllPanels(resolveBookingLayout("shoot_completed"));
      expect(panels).toContain("tasks" satisfies BookingPanel);
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("client_info" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
    });

    it("does not include itinerary (shoot is over)", () => {
      expect(getAllPanels(resolveBookingLayout("shoot_completed"))).not.toContain(
        "itinerary" satisfies BookingPanel
      );
    });

    it("does not include deliverables (not yet in post-production)", () => {
      expect(getAllPanels(resolveBookingLayout("shoot_completed"))).not.toContain(
        "deliverables" satisfies BookingPanel
      );
    });

    it("tasks appears before payment (priority ordering)", () => {
      const panels = getAllPanels(resolveBookingLayout("shoot_completed"));
      expect(panels.indexOf("tasks")).toBeLessThan(panels.indexOf("payment"));
    });
  });

  // ── editing layout ────────────────────────────────────────────────────────

  describe("editing layout", () => {
    it("includes payment, package_extras, tasks, notes", () => {
      const panels = getAllPanels(resolveBookingLayout("editing"));
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
      expect(panels).toContain("notes" satisfies BookingPanel);
    });

    it("does not include itinerary (shoot day is over)", () => {
      expect(getAllPanels(resolveBookingLayout("editing"))).not.toContain(
        "itinerary" satisfies BookingPanel
      );
    });

    it("editing_pipeline is in the first section", () => {
      const { sections } = resolveBookingLayout("editing");
      expect(sections[0].slots.map((s) => s.panel)).toContain(
        "editing_pipeline" satisfies BookingPanel
      );
    });
  });

  // ── delivered layout ──────────────────────────────────────────────────────

  describe("delivered layout", () => {
    it("includes payment, deliverables, client_info, package_extras, tasks", () => {
      const panels = getAllPanels(resolveBookingLayout("delivered"));
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("deliverables" satisfies BookingPanel);
      expect(panels).toContain("client_info" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
    });

    it("does not include itinerary (shoot is over)", () => {
      expect(getAllPanels(resolveBookingLayout("delivered"))).not.toContain(
        "itinerary" satisfies BookingPanel
      );
    });

    it("payment appears before tasks (payment is the priority)", () => {
      const panels = getAllPanels(resolveBookingLayout("delivered"));
      expect(panels.indexOf("payment")).toBeLessThan(panels.indexOf("tasks"));
    });
  });

  // ── done layout (archive) ─────────────────────────────────────────────────

  describe("done layout", () => {
    it("includes all archive panels", () => {
      const panels = getAllPanels(resolveBookingLayout("done"));
      expect(panels).toContain("client_info" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
      expect(panels).toContain("itinerary" satisfies BookingPanel);
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("deliverables" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
      expect(panels).toContain("notes" satisfies BookingPanel);
    });
  });

  // ── cancelled layout (archive) ────────────────────────────────────────────

  describe("cancelled layout", () => {
    it("includes all archive panels", () => {
      const panels = getAllPanels(resolveBookingLayout("cancelled"));
      expect(panels).toContain("client_info" satisfies BookingPanel);
      expect(panels).toContain("package_extras" satisfies BookingPanel);
      expect(panels).toContain("itinerary" satisfies BookingPanel);
      expect(panels).toContain("payment" satisfies BookingPanel);
      expect(panels).toContain("deliverables" satisfies BookingPanel);
      expect(panels).toContain("tasks" satisfies BookingPanel);
      expect(panels).toContain("notes" satisfies BookingPanel);
    });

    it("has same panel set as done (both are archives)", () => {
      const done = new Set(getAllPanels(resolveBookingLayout("done")));
      const cancelled = new Set(getAllPanels(resolveBookingLayout("cancelled")));
      expect(cancelled).toEqual(done);
    });
  });

  // ── section structure ─────────────────────────────────────────────────────

  describe("section structure", () => {
    for (const status of allStatuses) {
      it(`"${status}" layout has at least one section`, () => {
        expect(resolveBookingLayout(status).sections.length).toBeGreaterThan(0);
      });

      it(`all sections in "${status}" layout have at least one slot`, () => {
        for (const section of resolveBookingLayout(status).sections) {
          expect(section.slots.length).toBeGreaterThan(0);
        }
      });

      it(`no section in "${status}" layout has more than 3 slots`, () => {
        for (const section of resolveBookingLayout(status).sections) {
          expect(section.slots.length).toBeLessThanOrEqual(3);
        }
      });
    }
  });

  // ── fallback for unknown status ───────────────────────────────────────────

  it("returns a safe non-empty layout for an unknown status value", () => {
    const layout = resolveBookingLayout("unknown_future_status" as BookingStatus);
    expect(layout.sections.length).toBeGreaterThan(0);
    expect(getAllPanels(layout)).not.toContain(
      "editing_pipeline" satisfies BookingPanel
    );
    expect(getAllPanels(layout)).not.toContain(
      "availability_calendar" satisfies BookingPanel
    );
  });
});

// ── getAllPanels ──────────────────────────────────────────────────────────────

describe("getAllPanels", () => {
  it("returns panels in section/slot order", () => {
    const layout = resolveBookingLayout("inquiry");
    const panels = getAllPanels(layout);
    // availability_calendar is the first slot in the first section of inquiry
    expect(panels[0]).toBe("availability_calendar" satisfies BookingPanel);
  });

  it("returns one entry per slot (no deduplication)", () => {
    const layout = resolveBookingLayout("inquiry");
    const panels = getAllPanels(layout);
    const total = layout.sections.reduce((sum, s) => sum + s.slots.length, 0);
    expect(panels.length).toBe(total);
  });
});

// ── isForceShown ──────────────────────────────────────────────────────────────

describe("isForceShown", () => {
  it("returns true when a slot has forceShow: true", () => {
    const layout = resolveBookingLayout("inquiry");
    expect(isForceShown(layout, "notes")).toBe(true);
  });

  it("returns false when a panel is present but not force-shown", () => {
    const layout = resolveBookingLayout("done");
    expect(isForceShown(layout, "notes")).toBe(false);
  });

  it("returns false when the panel is not in the layout at all", () => {
    const layout = resolveBookingLayout("editing");
    expect(isForceShown(layout, "itinerary")).toBe(false);
  });
});
