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
  BookingStatus,
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

export async function getBookings(): Promise<BookingListItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .eq("photographer_id", user.id)
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
      is_second_shooter: b.second_shooter_id === user.id,
    };
  });
}

export async function getAllBookingsByDateRange(
  start: string,
  end: string
): Promise<BookingListItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .eq("photographer_id", user.id)
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

export async function getBookingsByDateRange(
  start: string,
  end: string
): Promise<BookingListItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .eq("photographer_id", user.id)
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

export async function getFutureBookings(): Promise<BookingListItem[]> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      package_version:package_versions(*),
      payment_log_entries(amount)
      `
    )
    .eq("photographer_id", user.id)
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

export interface CalendarBookingItem {
  id: string;
  client_name_primary: string;
  event_date: string | null;
  start_time: string | null;
  status: BookingStatus;
  venue_name: string | null;
  total_price: number;
  package_version: { hours_of_coverage: number | null; currency: string } | null;
}

export async function getCalendarBookings(
  start: string,
  end: string
): Promise<CalendarBookingItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, client_name_primary, event_date, start_time, status, venue_name, total_price,
       package_version:package_versions(hours_of_coverage, currency)`
    )
    .eq("photographer_id", user.id)
    .gte("event_date", start)
    .lte("event_date", end)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CalendarBookingItem[];
}

export async function getFutureCalendarBookings(): Promise<CalendarBookingItem[]> {
  const today = new Date().toISOString().split("T")[0];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, client_name_primary, event_date, start_time, status, venue_name, total_price,
       package_version:package_versions(hours_of_coverage, currency)`
    )
    .eq("photographer_id", user.id)
    .gte("event_date", today)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CalendarBookingItem[];
}

export async function getBookingById(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
    .eq("photographer_id", user.id)
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
