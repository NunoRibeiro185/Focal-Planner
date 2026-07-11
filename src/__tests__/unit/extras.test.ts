import { describe, it, expect } from "vitest";
import { computeGrandTotal } from "@/lib/utils/extras";

describe("computeGrandTotal", () => {
  it("returns total_price when there are no expenses", () => {
    expect(computeGrandTotal(1000)).toBe(1000);
    expect(computeGrandTotal(1000, [])).toBe(1000);
  });

  it("adds client-paid, unreimbursed expenses", () => {
    expect(
      computeGrandTotal(1000, [{ amount: 200, paid_by: "client", reimbursed: false }])
    ).toBe(1200);
  });

  it("ignores photographer-paid expenses", () => {
    expect(
      computeGrandTotal(1000, [{ amount: 200, paid_by: "photographer", reimbursed: false }])
    ).toBe(1000);
  });

  it("ignores reimbursed client expenses", () => {
    expect(
      computeGrandTotal(1000, [{ amount: 200, paid_by: "client", reimbursed: true }])
    ).toBe(1000);
  });

  it("sums multiple qualifying expenses", () => {
    expect(
      computeGrandTotal(800, [
        { amount: 100, paid_by: "client", reimbursed: false },
        { amount: 75, paid_by: "client", reimbursed: false },
        { amount: 999, paid_by: "photographer", reimbursed: false },
      ])
    ).toBe(975);
  });

  it("handles fractional amounts", () => {
    expect(
      computeGrandTotal(100, [{ amount: 99.99, paid_by: "client", reimbursed: false }])
    ).toBeCloseTo(199.99);
  });
});
