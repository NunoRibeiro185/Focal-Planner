/**
 * Tests for deliverables utility functions.
 */
import { describe, it, expect } from "vitest";
import { DELIVERABLE_META } from "@/lib/utils/deliverables";

describe("DELIVERABLE_META", () => {
  it("has meta for all 6 deliverable keys", () => {
    const keys = Object.keys(DELIVERABLE_META);
    expect(keys).toHaveLength(6);
  });

  it("each deliverable has at least 2 statuses (not_started + terminal)", () => {
    Object.values(DELIVERABLE_META).forEach((meta) => {
      expect(meta.statuses.length).toBeGreaterThanOrEqual(2);
      expect(meta.statuses[0]).toBe("not_started");
    });
  });

  it("wedding_album has the full production pipeline", () => {
    const statuses = DELIVERABLE_META.wedding_album.statuses;
    expect(statuses).toContain("ordered");
    expect(statuses).toContain("in_production");
    expect(statuses).toContain("shipped");
    expect(statuses).toContain("delivered");
  });
});
