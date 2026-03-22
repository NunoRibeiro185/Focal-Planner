/**
 * Currency formatting utilities.
 * Always formats using the currency from the booking/version snapshot —
 * never the photographer's current default_currency.
 */

export const SUPPORTED_CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc (Fr)" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona (kr)" },
  { code: "NOK", symbol: "kr", label: "Norwegian Krone (kr)" },
  { code: "DKK", symbol: "kr", label: "Danish Krone (kr)" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar (CA$)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (A$)" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real (R$)" },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Computes the total amount paid from a list of payment amounts.
 */
export function computeAmountPaid(amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/**
 * Computes the outstanding balance.
 */
export function computeBalance(totalPrice: number, amountPaid: number): number {
  return Math.max(0, totalPrice - amountPaid);
}

/**
 * Returns true if the booking is overdue:
 * due date is in the past and balance > 0.
 */
export function isOverdue(
  paymentDueDate: string | null,
  balance: number
): boolean {
  if (!paymentDueDate || balance <= 0) return false;
  return new Date(paymentDueDate) < new Date(new Date().toDateString());
}
