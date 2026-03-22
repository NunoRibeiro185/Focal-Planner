/**
 * Computes the grand total of a booking:
 *   grand_total = package total_price + SUM(extra.price_snapshot * extra.quantity)
 */
export function computeGrandTotal(
  totalPrice: number,
  extras: Array<{ price_snapshot: number; quantity: number }>
): number {
  const extrasSum = extras.reduce(
    (sum, e) => sum + e.price_snapshot * e.quantity,
    0
  );
  return totalPrice + extrasSum;
}
