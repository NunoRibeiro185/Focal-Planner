/**
 * Computes the grand total of a booking:
 *   grand_total = package total_price
 *               + SUM(extra.price_snapshot × extra.quantity)
 *               + SUM(client-paid, unreimbursed expenses)
 *
 * The clientExpenses parameter is optional to keep existing callers working.
 */
export function computeGrandTotal(
  totalPrice: number,
  extras: Array<{ price_snapshot: number; quantity: number }>,
  clientExpenses: Array<{ amount: number; paid_by: string; reimbursed: boolean }> = []
): number {
  const extrasSum = extras.reduce(
    (sum, e) => sum + e.price_snapshot * e.quantity,
    0
  );
  const expensesSum = clientExpenses
    .filter((e) => e.paid_by === "client" && !e.reimbursed)
    .reduce((sum, e) => sum + e.amount, 0);
  return totalPrice + extrasSum + expensesSum;
}
