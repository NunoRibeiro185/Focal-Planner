import { createClient, getUser } from "@/lib/supabase/server";
import type {
  Booking,
  BookingWithVersion,
  BookingTask,
  BookingItineraryStop,
  BookingEditingStage,
  PaymentLogEntry,
  PackageVersion,
  Expense,
  BookingStatus,
} from "@/lib/types";
import { computeAmountPaid, computeBalance, isOverdue } from "@/lib/utils/currency";
import { computeGrandTotal } from "@/lib/utils/extras";

// The list queries select only a subset of package_version columns (the list UI
// reads version_name/currency/hours). Detail views use BookingWithVersion (full
// row) via getBookingById.
export interface BookingListItem extends Booking {
  package_version: Pick<
    PackageVersion,
    "id" | "version_name" | "hours_of_coverage" | "currency"
  > | null;
  amount_paid: number;
  balance: number;
  overdue: boolean;
  package_name: string | null;
  is_second_shooter: boolean;
}

// Shared select for all booking-list views: full booking row + the few
// package_version columns the list needs (with its template, for package_name)
// + payment amounts (for balance).
const BOOKING_LIST_SELECT = `*,
  package_version:package_versions(
    id, version_name, hours_of_coverage, currency,
    template:package_templates!package_versions_package_template_id_fkey(id, name)
  ),
  payment_log_entries(amount)`;

interface BookingListFilters {
  archived?: boolean;
  excludeStatuses?: BookingStatus[];
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
}

async function fetchBookingList(filters: BookingListFilters): Promise<BookingListItem[]> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(BOOKING_LIST_SELECT)
    .eq("photographer_id", user.id);

  if (filters.archived !== undefined) query = query.eq("is_archived", filters.archived);
  for (const status of filters.excludeStatuses ?? []) query = query.neq("status", status);
  if (filters.dateFrom) query = query.gte("event_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("event_date", filters.dateTo);

  const { data, error } = await query.order("event_date", {
    ascending: filters.order !== "desc",
  });
  if (error) throw error;

  return (data ?? []).map((b) => {
    const amountPaid = computeAmountPaid((b.payment_log_entries ?? []).map((e) => e.amount));
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

/** Active (non-archived, non-inquiry) bookings, soonest first. */
export function getBookings(): Promise<BookingListItem[]> {
  return fetchBookingList({ archived: false, excludeStatuses: ["inquiry"], order: "asc" });
}

/** Archived bookings, most recent first. */
export function getArchivedBookings(): Promise<BookingListItem[]> {
  return fetchBookingList({ archived: true, order: "desc" });
}

/** All bookings within a date range (used by the availability calendar). */
export function getAllBookingsByDateRange(
  start: string,
  end: string
): Promise<BookingListItem[]> {
  return fetchBookingList({ dateFrom: start, dateTo: end, order: "asc" });
}

/** Upcoming, non-cancelled bookings (used by Google Calendar sync). */
export function getFutureBookings(): Promise<BookingListItem[]> {
  const today = new Date().toISOString().split("T")[0];
  return fetchBookingList({ dateFrom: today, excludeStatuses: ["cancelled"], order: "asc" });
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
       payment_log_entries(*),
       booking_itinerary_stops(*),
       booking_editing_stages(*),
       expenses(*)`
    )
    .eq("id", id)
    .eq("photographer_id", user.id)
    .order("sort_order", { referencedTable: "booking_tasks", ascending: true })
    .order("paid_date", { referencedTable: "payment_log_entries", ascending: true })
    .order("sort_order", { referencedTable: "booking_itinerary_stops", ascending: true })
    .order("sort_order", { referencedTable: "booking_editing_stages", ascending: true })
    .order("expense_date", { referencedTable: "expenses", ascending: false })
    .single();

  if (error) throw error;
  if (!raw) throw new Error("Booking not found");

  const {
    booking_tasks: tasks,
    payment_log_entries: payments,
    booking_itinerary_stops: itineraryStops,
    booking_editing_stages: editingStages,
    expenses: bookingExpenses,
    ...bookingData
  } = raw;

  const booking = bookingData as BookingWithVersion;

  const amountPaid = computeAmountPaid(
    ((payments ?? []) as PaymentLogEntry[]).map((p) => p.amount)
  );
  const grandTotal = computeGrandTotal(
    booking.total_price,
    (bookingExpenses ?? []) as Expense[]
  );
  const balance = computeBalance(grandTotal, amountPaid);

  return {
    booking,
    tasks: (tasks ?? []) as BookingTask[],
    itineraryStops: (itineraryStops ?? []) as BookingItineraryStop[],
    editingStages: (editingStages ?? []) as BookingEditingStage[],
    payments: (payments ?? []) as PaymentLogEntry[],
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
  const { data, error } = await supabase
    .from("inquiry_answers")
    .select("*")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
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
