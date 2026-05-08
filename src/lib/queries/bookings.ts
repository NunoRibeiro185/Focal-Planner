import { createClient, getUser } from "@/lib/supabase/server";
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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `id, client_name_primary, client_name_secondary, event_date, venue_name, status,
       total_price, payment_due_date, is_archived, photographer_id, second_shooter_id,
       package_version:package_versions(
         id, version_name, hours_of_coverage, currency,
         template:package_templates!package_versions_package_template_id_fkey(id, name)
       ),
       payment_log_entries(amount)`
    )
    .eq("photographer_id", user.id)
    .eq("is_archived", false)
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
      package_name: b.package_version?.template?.name ?? null,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
      is_second_shooter: b.second_shooter_id === user.id,
    };
  });
}

export async function getArchivedBookings(): Promise<BookingListItem[]> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `id, client_name_primary, client_name_secondary, event_date, status,
       total_price, payment_due_date, is_archived, photographer_id, second_shooter_id,
       package_version:package_versions(id, version_name, hours_of_coverage, currency),
       payment_log_entries(amount)`
    )
    .eq("photographer_id", user.id)
    .eq("is_archived", true)
    .order("event_date", { ascending: false });

  if (error) throw error;

  const rows = bookings ?? [];

  return rows.map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      package_name: null,
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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `*,
       package_version:package_versions(*, template:package_templates!package_versions_package_template_id_fkey(id, name)),
       payment_log_entries(amount)`
    )
    .eq("photographer_id", user.id)
    .gte("event_date", start)
    .lte("event_date", end)
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
      package_name: b.package_version?.template?.name ?? null,
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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `*,
       package_version:package_versions(*),
       payment_log_entries(amount)`
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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `*,
       package_version:package_versions(*),
       payment_log_entries(amount)`
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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

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
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

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
    .eq("photographer_id", user.id)
    .order("sort_order", { referencedTable: "booking_tasks", ascending: true })
    .order("created_at", { referencedTable: "booking_deliverable_progress", ascending: true })
    .order("paid_date", { referencedTable: "payment_log_entries", ascending: true })
    .order("created_at", { referencedTable: "booking_extras", ascending: true })
    .order("sort_order", { referencedTable: "booking_itinerary_stops", ascending: true })
    .order("sort_order", { referencedTable: "booking_editing_stages", ascending: true })
    .order("expense_date", { referencedTable: "expenses", ascending: false })
    .single();

  if (error) throw error;

  const {
    booking_tasks: tasks,
    booking_deliverable_progress: deliverableProgress,
    payment_log_entries: payments,
    booking_extras: bookingExtras,
    booking_itinerary_stops: itineraryStops,
    booking_editing_stages: editingStages,
    expenses: bookingExpenses,
    ...bookingData
  } = raw as any;

  const booking = bookingData as BookingWithVersion;

  const amountPaid = computeAmountPaid(
    ((payments ?? []) as PaymentLogEntry[]).map((p) => p.amount)
  );
  const grandTotal = computeGrandTotal(
    booking.total_price,
    (bookingExtras ?? []) as BookingExtra[],
    (bookingExpenses ?? []) as Expense[]
  );
  const balance = computeBalance(grandTotal, amountPaid);

  return {
    booking,
    tasks: (tasks ?? []) as BookingTask[],
    deliverableProgress: (deliverableProgress ?? []) as BookingDeliverableProgress[],
    itineraryStops: (itineraryStops ?? []) as BookingItineraryStop[],
    editingStages: (editingStages ?? []) as BookingEditingStage[],
    payments: (payments ?? []) as PaymentLogEntry[],
    bookingExtras: (bookingExtras ?? []) as BookingExtra[],
    bookingExpenses: (bookingExpenses ?? []) as Expense[],
    amountPaid,
    grandTotal,
    balance,
    overdue: isOverdue(booking.payment_due_date, balance),
  };
}

export async function getInquiryAnswers(bookingId: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("inquiry_answers")
    .select("*")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as import("@/lib/types/database").InquiryAnswer[];
}

export async function getBookingsThisMonthCount(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;

  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("photographer_id", user.id)
    .gte("created_at", start)
    .lte("created_at", end);

  return count ?? 0;
}
