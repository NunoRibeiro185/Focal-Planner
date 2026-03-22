/**
 * Tests for deliverables utility functions.
 */
import { describe, it, expect } from "vitest";
import {
  getEnabledDeliverables,
  DELIVERABLE_META,
} from "@/lib/utils/deliverables";
import type { PackageVersion } from "@/lib/types";

function makeVersion(overrides: Partial<PackageVersion> = {}): PackageVersion {
  return {
    id: "v1",
    package_template_id: "t1",
    photographer_id: "p1",
    version_number: 1,
    base_price: 2000,
    currency: "EUR",
    hours_of_coverage: 8,
    edited_photos_count: null,
    wedding_album: false,
    film_rolls_count: null,
    video: false,
    short_clips: false,
    second_shooter: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getEnabledDeliverables", () => {
  it("returns empty array when no deliverables are set", () => {
    expect(getEnabledDeliverables(makeVersion())).toHaveLength(0);
  });

  it("includes edited_photos when count > 0", () => {
    const keys = getEnabledDeliverables(makeVersion({ edited_photos_count: 300 }));
    expect(keys).toContain("edited_photos");
  });

  it("excludes edited_photos when count is 0", () => {
    const keys = getEnabledDeliverables(makeVersion({ edited_photos_count: 0 }));
    expect(keys).not.toContain("edited_photos");
  });

  it("includes wedding_album when true", () => {
    const keys = getEnabledDeliverables(makeVersion({ wedding_album: true }));
    expect(keys).toContain("wedding_album");
  });

  it("includes film_rolls when count > 0", () => {
    const keys = getEnabledDeliverables(makeVersion({ film_rolls_count: 5 }));
    expect(keys).toContain("film_rolls");
  });

  it("includes video when true", () => {
    const keys = getEnabledDeliverables(makeVersion({ video: true }));
    expect(keys).toContain("video");
  });

  it("includes short_clips when true", () => {
    const keys = getEnabledDeliverables(makeVersion({ short_clips: true }));
    expect(keys).toContain("short_clips");
  });

  it("includes second_shooter when true", () => {
    const keys = getEnabledDeliverables(makeVersion({ second_shooter: true }));
    expect(keys).toContain("second_shooter");
  });

  it("returns all enabled deliverables for a full package", () => {
    const keys = getEnabledDeliverables(
      makeVersion({
        edited_photos_count: 400,
        wedding_album: true,
        film_rolls_count: 3,
        video: true,
        short_clips: true,
        second_shooter: true,
      })
    );
    expect(keys).toHaveLength(6);
    expect(keys).toContain("edited_photos");
    expect(keys).toContain("wedding_album");
    expect(keys).toContain("film_rolls");
    expect(keys).toContain("video");
    expect(keys).toContain("short_clips");
    expect(keys).toContain("second_shooter");
  });
});

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
