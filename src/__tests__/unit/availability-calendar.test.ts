import { describe, it, expect } from "vitest";
import {
  shouldBleedIntoNextMonth,
  getAvailabilityCalendarRange,
} from "@/lib/utils/availability-calendar";

// ── shouldBleedIntoNextMonth ──────────────────────────────────────────────────

describe("shouldBleedIntoNextMonth", () => {
  it("returns false for dates early in the month (day 1)", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 5, 1))).toBe(false);
  });

  it("returns false for dates in the middle of the month (day 15)", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 5, 15))).toBe(false);
  });

  it("returns false for day 24 (boundary before last week)", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 5, 24))).toBe(false);
  });

  it("returns true for day 25 (first day of last week zone)", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 5, 25))).toBe(true);
  });

  it("returns true for day 28", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 5, 28))).toBe(true);
  });

  it("returns true for day 31 (last possible day)", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 0, 31))).toBe(true);
  });

  it("handles end of year: December 28 triggers bleed into January", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 11, 28))).toBe(true);
  });

  it("handles end of year: December 24 does NOT trigger bleed", () => {
    expect(shouldBleedIntoNextMonth(new Date(2025, 11, 24))).toBe(false);
  });
});

// ── getAvailabilityCalendarRange ──────────────────────────────────────────────

describe("getAvailabilityCalendarRange", () => {
  it("returns ISO date strings", () => {
    const { start, end } = getAvailabilityCalendarRange(new Date(2025, 5, 15));
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("start is before or equal to end", () => {
    const { start, end } = getAvailabilityCalendarRange(new Date(2025, 5, 15));
    expect(start <= end).toBe(true);
  });

  it("range includes the event date", () => {
    const date = new Date(2025, 5, 15); // June 15
    const { start, end } = getAvailabilityCalendarRange(date);
    const eventDateStr = "2025-06-15";
    expect(start <= eventDateStr && eventDateStr <= end).toBe(true);
  });

  it("range includes the first day of the event month", () => {
    const { start, end } = getAvailabilityCalendarRange(new Date(2025, 5, 15));
    expect(start <= "2025-06-01" && "2025-06-01" <= end).toBe(true);
  });

  it("range includes the last day of the event month", () => {
    const { start, end } = getAvailabilityCalendarRange(new Date(2025, 5, 15));
    expect(start <= "2025-06-30" && "2025-06-30" <= end).toBe(true);
  });

  it("range extends beyond end of month (natural grid overflow)", () => {
    // June 2025 ends on a Monday — grid row completes through Saturday July 5
    const { end } = getAvailabilityCalendarRange(new Date(2025, 5, 28));
    expect(end >= "2025-06-30").toBe(true);
  });

  it("handles a date in the last week: range includes days from next month", () => {
    // Date in last week — grid overflow ensures next month is visible
    const { end } = getAvailabilityCalendarRange(new Date(2025, 5, 28));
    expect(shouldBleedIntoNextMonth(new Date(2025, 5, 28))).toBe(true);
    expect(end > "2025-06-30").toBe(true); // at least some of July is included
  });

  it("handles December: range may include days from the following January", () => {
    const { end } = getAvailabilityCalendarRange(new Date(2025, 11, 28));
    expect(end >= "2025-12-31").toBe(true);
  });
});
