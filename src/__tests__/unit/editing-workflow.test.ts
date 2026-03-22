import { describe, it, expect } from "vitest";
import {
  computeEditingProgress,
  hasEditingStagesConfigured,
  buildBookingStagesFromTemplates,
} from "@/lib/utils/editing-workflow";
import type { BookingEditingStage } from "@/lib/types";

const BOOKING_ID = "booking-1";
const PHOTOGRAPHER_ID = "photographer-1";

function makeStage(
  overrides: Partial<BookingEditingStage> = {}
): BookingEditingStage {
  return {
    id: "stage-1",
    booking_id: BOOKING_ID,
    photographer_id: PHOTOGRAPHER_ID,
    title: "Culling",
    sort_order: 0,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── computeEditingProgress ────────────────────────────────────────────────────

describe("computeEditingProgress", () => {
  it("returns 0 for an empty stage list", () => {
    expect(computeEditingProgress([])).toBe(0);
  });

  it("returns 0 when no stages are complete", () => {
    const stages = [makeStage({ completed_at: null })];
    expect(computeEditingProgress(stages)).toBe(0);
  });

  it("returns 100 when all stages are complete", () => {
    const stages = [
      makeStage({ id: "s1", completed_at: "2026-03-01T00:00:00Z" }),
      makeStage({ id: "s2", completed_at: "2026-03-02T00:00:00Z" }),
    ];
    expect(computeEditingProgress(stages)).toBe(100);
  });

  it("returns 25 when 1 of 4 stages is complete", () => {
    const stages = [
      makeStage({ id: "s1", completed_at: "2026-03-01T00:00:00Z" }),
      makeStage({ id: "s2", completed_at: null }),
      makeStage({ id: "s3", completed_at: null }),
      makeStage({ id: "s4", completed_at: null }),
    ];
    expect(computeEditingProgress(stages)).toBe(25);
  });

  it("returns 50 when 2 of 4 stages are complete", () => {
    const stages = [
      makeStage({ id: "s1", completed_at: "2026-03-01T00:00:00Z" }),
      makeStage({ id: "s2", completed_at: "2026-03-02T00:00:00Z" }),
      makeStage({ id: "s3", completed_at: null }),
      makeStage({ id: "s4", completed_at: null }),
    ];
    expect(computeEditingProgress(stages)).toBe(50);
  });

  it("returns 75 when 3 of 4 stages are complete", () => {
    const stages = [
      makeStage({ id: "s1", completed_at: "2026-03-01T00:00:00Z" }),
      makeStage({ id: "s2", completed_at: "2026-03-02T00:00:00Z" }),
      makeStage({ id: "s3", completed_at: "2026-03-03T00:00:00Z" }),
      makeStage({ id: "s4", completed_at: null }),
    ];
    expect(computeEditingProgress(stages)).toBe(75);
  });
});

// ── hasEditingStagesConfigured ────────────────────────────────────────────────

describe("hasEditingStagesConfigured", () => {
  it("returns false when template count is 0", () => {
    expect(hasEditingStagesConfigured(0)).toBe(false);
  });

  it("returns true when template count is 1", () => {
    expect(hasEditingStagesConfigured(1)).toBe(true);
  });

  it("returns true when template count is greater than 1", () => {
    expect(hasEditingStagesConfigured(5)).toBe(true);
  });
});

// ── buildBookingStagesFromTemplates ──────────────────────────────────────────

describe("buildBookingStagesFromTemplates", () => {
  const templates = [
    { id: "t1", title: "Culling", sort_order: 0 },
    { id: "t2", title: "Color Grade", sort_order: 1 },
    { id: "t3", title: "Retouching", sort_order: 2 },
    { id: "t4", title: "Gallery Upload", sort_order: 3 },
  ];

  it("returns one row per template", () => {
    const rows = buildBookingStagesFromTemplates(
      templates,
      BOOKING_ID,
      PHOTOGRAPHER_ID
    );
    expect(rows).toHaveLength(4);
  });

  it("copies title and sort_order from templates", () => {
    const rows = buildBookingStagesFromTemplates(
      templates,
      BOOKING_ID,
      PHOTOGRAPHER_ID
    );
    expect(rows[0].title).toBe("Culling");
    expect(rows[0].sort_order).toBe(0);
    expect(rows[3].title).toBe("Gallery Upload");
    expect(rows[3].sort_order).toBe(3);
  });

  it("sets completed_at to null for all rows", () => {
    const rows = buildBookingStagesFromTemplates(
      templates,
      BOOKING_ID,
      PHOTOGRAPHER_ID
    );
    expect(rows.every((r) => r.completed_at === null)).toBe(true);
  });

  it("stamps every row with the correct booking_id and photographer_id", () => {
    const rows = buildBookingStagesFromTemplates(
      templates,
      BOOKING_ID,
      PHOTOGRAPHER_ID
    );
    expect(rows.every((r) => r.booking_id === BOOKING_ID)).toBe(true);
    expect(rows.every((r) => r.photographer_id === PHOTOGRAPHER_ID)).toBe(true);
  });

  it("returns an empty array for an empty template list", () => {
    const rows = buildBookingStagesFromTemplates([], BOOKING_ID, PHOTOGRAPHER_ID);
    expect(rows).toHaveLength(0);
  });
});
