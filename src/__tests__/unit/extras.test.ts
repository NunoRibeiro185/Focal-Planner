import { describe, it, expect } from "vitest";
import { computeGrandTotal } from "@/lib/utils/extras";

describe("computeGrandTotal", () => {
  it("returns total_price when there are no extras", () => {
    expect(computeGrandTotal(1000, [])).toBe(1000);
  });

  it("adds a single extra with quantity 1", () => {
    expect(computeGrandTotal(1000, [{ price_snapshot: 200, quantity: 1 }])).toBe(1200);
  });

  it("multiplies price by quantity", () => {
    expect(computeGrandTotal(500, [{ price_snapshot: 50, quantity: 3 }])).toBe(650);
  });

  it("sums multiple extras", () => {
    const extras = [
      { price_snapshot: 100, quantity: 2 },
      { price_snapshot: 75, quantity: 1 },
    ];
    expect(computeGrandTotal(800, extras)).toBe(1075);
  });

  it("handles fractional prices correctly", () => {
    expect(
      computeGrandTotal(100, [{ price_snapshot: 33.33, quantity: 3 }])
    ).toBeCloseTo(199.99);
  });

  it("handles a zero-price extra (no change to total)", () => {
    expect(computeGrandTotal(500, [{ price_snapshot: 0, quantity: 5 }])).toBe(500);
  });

  it("returns total_price when all extras have zero price", () => {
    const extras = [
      { price_snapshot: 0, quantity: 1 },
      { price_snapshot: 0, quantity: 10 },
    ];
    expect(computeGrandTotal(999, extras)).toBe(999);
  });
});
