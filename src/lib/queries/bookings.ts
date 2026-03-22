import { createClient } from "@/lib/supabase/server";
import type {
  BookingWithVersion,
  BookingTask,
  BookingExtra,
  BookingDeliverableProgress,
  BookingItineraryStop,
  PaymentLogEntry,
} from "@/lib/types";
import { computeAmountPaid, computeBalance, isOverdue } from "@/lib/utils/currency";
import { computeGrandTotal } from "@/lib/utils/extras";

export interface BookingListItem extends BookingWithVersion {
  amount_paid: number;
  balance: number;
  overdue: boolean;
}

/**
 * Returns all bookings for the current user, ordered by event date.
 * Includes the package version snapshot and computed payment totals.
 */
export async function getBookings(): Promise<BookingListItem[]> {
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .order("event_date", { ascending: true });

  if (error) throw error;

  return (bookings ?? []).map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
    };
  });
}

/**
 * Returns bookings whose event_date falls within [start, end] (inclusive).
 * Excludes cancelled bookings. Used by the calendar aggregator.
 */
export async function getBookingsByDateRange(
  start: string,
  end: string
): Promise<BookingListItem[]> {
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .gte("event_date", start)
    .lte("event_date", end)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (error) throw error;

  return (bookings ?? []).map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
    };
  });
}

/**
 * Returns all future bookings (event_date >= today), excluding cancelled.
 * Used for the agenda view and bulk Google Calendar push.
 */
export async function getFutureBookings(): Promise<BookingListItem[]> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .gte("event_date", today)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (error) throw error;

  return (bookings ?? []).map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
    };
  });
}

/**
 * Returns a single booking with all related data.
 */
export async function getBookingById(id: string) {
  const supabase = await createClient();

  const [bookingResult, tasksResult, deliverableProgressResult, paymentsResult, extrasResult, itineraryResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(`*, package_version:package_versions(*)`)
        .eq("id", id)
        .single(),
      supabase
        .from("booking_tasks")
        .select("*")
        .eq("booking_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("booking_deliverable_progress")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("payment_log_entries")
        .select("*")
        .eq("booking_id", id)
        .order("paid_date", { ascending: true }),
      supabase
        .from("booking_extras")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("booking_itinerary_stops")
        .select("*")
        .eq("booking_id", id)
        .order("sort_order", { ascending: true }),
    ]);

  if (bookingResult.error) throw bookingResult.error;

  const booking = bookingResult.data as BookingWithVersion;
  const payments = (paymentsResult.data ?? []) as PaymentLogEntry[];
  const bookingExtras = (extrasResult.data ?? []) as BookingExtra[];
  const amountPaid = computeAmountPaid(payments.map((p) => p.amount));
  const grandTotal = computeGrandTotal(booking.total_price, bookingExtras);
  const balance = computeBalance(grandTotal, amountPaid);

  return {
    booking,
    tasks: (tasksResult.data ?? []) as BookingTask[],
    deliverableProgress: (deliverableProgressResult.data ?? []) as BookingDeliverableProgress[],
    itineraryStops: (itineraryResult.data ?? []) as BookingItineraryStop[],
    payments,
    bookingExtras,
    amountPaid,
    grandTotal,
    balance,
    overdue: isOverdue(booking.payment_due_date, balance),
  };
}
