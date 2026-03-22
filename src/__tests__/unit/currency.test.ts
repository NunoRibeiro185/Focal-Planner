/**
 * Tests for currency utility functions.
 * These are pure functions — no mocking needed.
 */
import { describe, it, expect } from "vitest";
import {
  computeAmountPaid,
  computeBalance,
  isOverdue,
} from "@/lib/utils/currency";

describe("computeAmountPaid", () => {
  it("sums all payment amounts", () => {
    expect(computeAmountPaid([500, 250, 750])).toBe(1500);
  });

  it("returns 0 for empty array", () => {
    expect(computeAmountPaid([])).toBe(0);
  });

  it("handles a single payment", () => {
    expect(computeAmountPaid([1000])).toBe(1000);
  });
});

describe("computeBalance", () => {
  it("returns total minus amount paid", () => {
    expect(computeBalance(2000, 500)).toBe(1500);
  });

  it("returns 0 when fully paid", () => {
    expect(computeBalance(2000, 2000)).toBe(0);
  });

  it("never returns a negative balance (overpayment clamped to 0)", () => {
    expect(computeBalance(2000, 2500)).toBe(0);
  });

  it("returns full amount when nothing has been paid", () => {
    expect(computeBalance(1500, 0)).toBe(1500);
  });
});

describe("isOverdue", () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  it("returns true when due date is past and balance > 0", () => {
    expect(isOverdue(yesterday, 500)).toBe(true);
  });

  it("returns false when due date is in the future", () => {
    expect(isOverdue(tomorrow, 500)).toBe(false);
  });

  it("returns false when balance is 0 (fully paid)", () => {
    expect(isOverdue(yesterday, 0)).toBe(false);
  });

  it("returns false when due date is null", () => {
    expect(isOverdue(null, 500)).toBe(false);
  });

  it("returns false when both due date is null and balance is 0", () => {
    expect(isOverdue(null, 0)).toBe(false);
  });
});
