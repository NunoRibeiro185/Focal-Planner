import { createClient } from "@/lib/supabase/server";
import type {
  BookingWithVersion,
  BookingTask,
  BookingExtra,
  BookingDeliverableProgress,
  BookingItineraryStop,
  BookingEditingStage,
  PaymentLogEntry,
  Expense,
} from "@/lib/types";
import { computeAmountPaid, computeBalance, isOverdue } from "@/lib/utils/currency";
import { computeGrandTotal } from "@/lib/utils/extras";

export interface BookingListItem extends BookingWithVersion {
  amount_paid: number;
  balance: number;
  overdue: boolean;
  package_name: string | null;
  is_second_shooter: boolean;
}

/**
 * Returns all bookings for the current user, ordered by event date.
 * Includes the package version snapshot and computed payment totals.
 */
export async function getBookings(): Promise<BookingListItem[]> {
  const supabase = await createClient();

  const [bookingsResult, { data: { user } }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        *,
        package_version:package_versions(*),
        payment_log_entries(amount)
        `
      )
      .order("event_date", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const { data: bookings, error } = bookingsResult;
  if (error) throw error;

  const rows = bookings ?? [];

  // Fetch template names in a single query
  const templateIds = [...new Set(rows.map((b: any) => b.package_version?.package_template_id).filter(Boolean))];
  const templateMap = new Map<string, string>();
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("package_templates")
      .select("id, name")
      .in("id", templateIds);
    templates?.forEach((t: any) => templateMap.set(t.id, t.name));
  }

  return rows.map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      package_name: templateMap.get(b.package_version?.package_template_id) ?? null,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
      is_second_shooter: b.second_shooter_id === user?.id,
    };
  });
}

/**
 * Returns ALL bookings (including cancelled) whose event_date falls within
 * [start, end] (inclusive). Used by the availability calendar panel to show
 * a complete picture of schedule pressure on a given date.
 */
export async function getAllBookingsByDateRange(
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
    .order("event_date", { ascending: true });

  if (error) throw error;

  const rows = bookings ?? [];

  const templateIds = [...new Set(rows.map((b: any) => b.package_version?.package_template_id).filter(Boolean))];
  const templateMap = new Map<string, string>();
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("package_templates")
      .select("id, name")
      .in("id", templateIds);
    templates?.forEach((t: any) => templateMap.set(t.id, t.name));
  }

  return rows.map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      package_name: templateMap.get(b.package_version?.package_template_id) ?? null,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
      is_second_shooter: false,
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
      is_second_shooter: false,
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
      is_second_shooter: false,
    };
  });
}

/**
 * Minimal booking shape needed to render a calendar event.
 * Intentionally narrow — no payment data, no full wildcard select.
 */
export interface CalendarBookingItem {
  id: string;
  client_name_primary: string;
  event_date: string | null;
  start_time: string | null;
  status: string;
  venue_name: string | null;
  total_price: number;
  package_version: { hours_of_coverage: number | null; currency: string } | null;
}

/**
 * Lean calendar query: only the 7 columns bookingToCalendarEvent actually reads.
 * No payment_log_entries, no wildcard select — used by the calendar aggregator.
 */
export async function getCalendarBookings(
  start: string,
  end: string
): Promise<CalendarBookingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, client_name_primary, event_date, start_time, status, venue_name, total_price,
       package_version:package_versions(hours_of_coverage, currency)`
    )
    .gte("event_date", start)
    .lte("event_date", end)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CalendarBookingItem[];
}

/**
 * Same lean query for the agenda view (future bookings only).
 */
export async function getFutureCalendarBookings(): Promise<CalendarBookingItem[]> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, client_name_primary, event_date, start_time, status, venue_name, total_price,
       package_version:package_versions(hours_of_coverage, currency)`
    )
    .gte("event_date", today)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CalendarBookingItem[];
}

/**
 * Returns a single booking with all related data.
 *
 * Uses a single nested PostgREST select instead of 7 parallel queries —
 * one HTTP round-trip vs seven, which substantially cuts re-render time
 * after server actions.
 */
export async function getBookingById(id: string) {
  const supabase = await createClient();

  const { data: raw, error } = await supabase
    .from("bookings")
    .select(
      `*,
       package_version:package_versions(*),
       booking_tasks(*),
       booking_deliverable_progress(*),
       payment_log_entries(*),
       booking_extras(*),
       booking_itinerary_stops(*),
       booking_editing_stages(*),
       expenses(*)`
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  const {
    booking_tasks: rawTasks,
    booking_deliverable_progress: rawDeliverables,
    payment_log_entries: rawPayments,
    booking_extras: rawExtras,
    booking_itinerary_stops: rawItinerary,
    booking_editing_stages: rawEditingStages,
    expenses: rawExpenses,
    ...bookingData
  } = raw as any;

  const booking = bookingData as BookingWithVersion;

  // Sort client-side — data volumes are small and nested PostgREST selects
  // don't support per-relation ordering via the JS client.
  const tasks = ((rawTasks ?? []) as BookingTask[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const deliverableProgress = ((rawDeliverables ?? []) as BookingDeliverableProgress[])
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const payments = ((rawPayments ?? []) as PaymentLogEntry[])
    .sort((a, b) => a.paid_date.localeCompare(b.paid_date));
  const bookingExtras = ((rawExtras ?? []) as BookingExtra[])
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const itineraryStops = ((rawItinerary ?? []) as BookingItineraryStop[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const editingStages = ((rawEditingStages ?? []) as BookingEditingStage[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const bookingExpenses = ((rawExpenses ?? []) as Expense[])
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date));

  const amountPaid = computeAmountPaid(payments.map((p) => p.amount));
  const grandTotal = computeGrandTotal(booking.total_price, bookingExtras, bookingExpenses);
  const balance = computeBalance(grandTotal, amountPaid);

  return {
    booking,
    tasks,
    deliverableProgress,
    itineraryStops,
    editingStages,
    payments,
    bookingExtras,
    bookingExpenses,
    amountPaid,
    grandTotal,
    balance,
    overdue: isOverdue(booking.payment_due_date, balance),
  };
}
