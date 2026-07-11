import { describe, it, expect } from "vitest";
import { computeVat, computeClientExpensesTotal, computeExpenseSummary } from "@/lib/utils/expenses";
import type { Expense } from "@/lib/types";

// ─── computeVat ───────────────────────────────────────────────

describe("computeVat", () => {
  it("returns zero VAT when vatPercentage is null", () => {
    const result = computeVat(100, null);
    expect(result.vatAmount).toBe(0);
    expect(result.netAmount).toBe(100);
  });

  it("returns zero VAT when vatPercentage is 0", () => {
    const result = computeVat(100, 0);
    expect(result.vatAmount).toBe(0);
    expect(result.netAmount).toBe(100);
  });

  it("correctly decomposes 23% VAT from VAT-inclusive amount", () => {
    // 123 total → 100 net + 23 VAT
    const result = computeVat(123, 23);
    expect(result.vatAmount).toBeCloseTo(23, 2);
    expect(result.netAmount).toBeCloseTo(100, 2);
  });

  it("correctly decomposes 21% VAT from VAT-inclusive amount", () => {
    // 121 total → 100 net + 21 VAT
    const result = computeVat(121, 21);
    expect(result.vatAmount).toBeCloseTo(21, 2);
    expect(result.netAmount).toBeCloseTo(100, 2);
  });

  it("handles 0% VAT as no VAT", () => {
    const result = computeVat(200, 0);
    expect(result.vatAmount).toBe(0);
    expect(result.netAmount).toBe(200);
  });

  it("vatAmount + netAmount equals the original amount", () => {
    const result = computeVat(250, 20);
    expect(result.vatAmount + result.netAmount).toBeCloseTo(250, 10);
  });

  it("handles fractional amounts correctly", () => {
    const result = computeVat(50.55, 23);
    expect(result.vatAmount + result.netAmount).toBeCloseTo(50.55, 10);
  });
});

// ─── computeClientExpensesTotal ───────────────────────────────

describe("computeClientExpensesTotal", () => {
  it("returns 0 when there are no expenses", () => {
    expect(computeClientExpensesTotal([])).toBe(0);
  });

  it("sums only client-paid, unreimbursed expenses", () => {
    const expenses = [
      { paid_by: "client" as const, reimbursed: false, amount: 100 },
      { paid_by: "client" as const, reimbursed: false, amount: 50 },
    ];
    expect(computeClientExpensesTotal(expenses)).toBe(150);
  });

  it("excludes reimbursed client expenses", () => {
    const expenses = [
      { paid_by: "client" as const, reimbursed: false, amount: 100 },
      { paid_by: "client" as const, reimbursed: true, amount: 200 },
    ];
    expect(computeClientExpensesTotal(expenses)).toBe(100);
  });

  it("excludes photographer-paid expenses", () => {
    const expenses = [
      { paid_by: "photographer" as const, reimbursed: false, amount: 300 },
      { paid_by: "client" as const, reimbursed: false, amount: 75 },
    ];
    expect(computeClientExpensesTotal(expenses)).toBe(75);
  });

  it("returns 0 when all client expenses are reimbursed", () => {
    const expenses = [
      { paid_by: "client" as const, reimbursed: true, amount: 100 },
      { paid_by: "client" as const, reimbursed: true, amount: 200 },
    ];
    expect(computeClientExpensesTotal(expenses)).toBe(0);
  });
});

// computeGrandTotal is covered in extras.test.ts.

// ─── computeExpenseSummary ────────────────────────────────────

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: "test-id",
    photographer_id: "ph-id",
    booking_id: null,
    category: "other",
    description: "Test",
    amount: 100,
    currency: "EUR",
    expense_date: "2026-04-01",
    vat_percentage: null,
    paid_by: "photographer",
    reimbursed: false,
    auto_generated: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("computeExpenseSummary", () => {
  it("returns zeros for empty array", () => {
    const result = computeExpenseSummary([]);
    expect(result.totalExpenses).toBe(0);
    expect(result.outstandingReimbursements).toBe(0);
    expect(result.totalVat).toBe(0);
  });

  it("sums all expenses for totalExpenses", () => {
    const expenses = [
      makeExpense({ amount: 100 }),
      makeExpense({ amount: 200 }),
      makeExpense({ amount: 50 }),
    ];
    expect(computeExpenseSummary(expenses).totalExpenses).toBe(350);
  });

  it("counts only unreimbursed client expenses as outstanding", () => {
    const expenses = [
      makeExpense({ paid_by: "client", reimbursed: false, amount: 100 }),
      makeExpense({ paid_by: "client", reimbursed: true, amount: 200 }),
      makeExpense({ paid_by: "photographer", reimbursed: false, amount: 50 }),
    ];
    expect(computeExpenseSummary(expenses).outstandingReimbursements).toBe(100);
  });

  it("computes totalVat across all expenses", () => {
    const expenses = [
      makeExpense({ amount: 121, vat_percentage: 21 }), // VAT ≈ 21
      makeExpense({ amount: 100, vat_percentage: null }),  // VAT = 0
    ];
    const result = computeExpenseSummary(expenses);
    expect(result.totalVat).toBeCloseTo(21, 2);
  });

  it("totalExpenses includes both photographer and client expenses", () => {
    const expenses = [
      makeExpense({ paid_by: "photographer", amount: 300 }),
      makeExpense({ paid_by: "client", reimbursed: false, amount: 100 }),
      makeExpense({ paid_by: "client", reimbursed: true, amount: 50 }),
    ];
    expect(computeExpenseSummary(expenses).totalExpenses).toBe(450);
  });
});
