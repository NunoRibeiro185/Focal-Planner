/**
 * Computes the grand total of a booking:
 *   grand_total = total_price + SUM(client-paid, unreimbursed expenses)
 *
 * (Line items/extras are folded into total_price via booking_services.)
 */
export function computeGrandTotal(
  totalPrice: number,
  clientExpenses: Array<{ amount: number; paid_by: string; reimbursed: boolean }> = []
): number {
  const expensesSum = clientExpenses
    .filter((e) => e.paid_by === "client" && !e.reimbursed)
    .reduce((sum, e) => sum + e.amount, 0);
  return totalPrice + expensesSum;
}
