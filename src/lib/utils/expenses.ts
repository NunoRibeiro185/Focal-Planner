/**
 * Pure utility functions for expense calculations.
 * No async, no side effects — fully testable in isolation.
 */

import type { Expense } from "@/lib/types";

// ─── VAT ─────────────────────────────────────────────────────

/**
 * Decomposes a VAT-inclusive amount into { vatAmount, netAmount }.
 * Returns zeroed VAT when vatPercentage is null or zero.
 *
 * Example: amount=121, vatPercentage=21 → vatAmount=21, netAmount=100
 */
export function computeVat(
  amount: number,
  vatPercentage: number | null
): { vatAmount: number; netAmount: number } {
  if (!vatPercentage || vatPercentage <= 0) {
    return { vatAmount: 0, netAmount: amount };
  }
  const vatAmount = amount * (vatPercentage / (100 + vatPercentage));
  const netAmount = amount - vatAmount;
  return { vatAmount, netAmount };
}

// ─── Booking expense totals ───────────────────────────────────

/**
 * Sums the amounts of client-paid, unreimbursed expenses.
 * These are the expenses that increase a booking's grand total.
 */
export function computeClientExpensesTotal(
  expenses: Pick<Expense, "paid_by" | "reimbursed" | "amount">[]
): number {
  return expenses
    .filter((e) => e.paid_by === "client" && !e.reimbursed)
    .reduce((sum, e) => sum + e.amount, 0);
}

// ─── Expenses page summary ────────────────────────────────────

export interface ExpenseSummary {
  /** Sum of all expense amounts (all filtered expenses). */
  totalExpenses: number;
  /** Sum of client-paid, unreimbursed expenses. */
  outstandingReimbursements: number;
  /** Sum of VAT amounts across all filtered expenses. */
  totalVat: number;
}

/**
 * Computes the three summary KPIs shown at the top of the Expenses page.
 * Pure — safe to call with any filtered subset of expenses.
 */
export function computeExpenseSummary(expenses: Expense[]): ExpenseSummary {
  let totalExpenses = 0;
  let outstandingReimbursements = 0;
  let totalVat = 0;

  for (const e of expenses) {
    totalExpenses += e.amount;
    if (e.paid_by === "client" && !e.reimbursed) {
      outstandingReimbursements += e.amount;
    }
    const { vatAmount } = computeVat(e.amount, e.vat_percentage);
    totalVat += vatAmount;
  }

  return { totalExpenses, outstandingReimbursements, totalVat };
}
