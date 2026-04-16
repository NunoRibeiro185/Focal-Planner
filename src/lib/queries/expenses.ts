import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";

export interface ExpenseWithBooking extends Expense {
  booking_client_name: string | null;
}

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  scope?: "general" | "booking";
  bookingId?: string;
}

export async function getExpenses(
  filters: ExpenseFilters = {}
): Promise<ExpenseWithBooking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .from("expenses")
    .select("*, booking:bookings(client_name_primary)")
    .eq("photographer_id", user.id)
    .order("expense_date", { ascending: false });

  if (filters.dateFrom) query = query.gte("expense_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("expense_date", filters.dateTo);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.scope === "general") query = query.is("booking_id", null);
  if (filters.scope === "booking") query = query.not("booking_id", "is", null);
  if (filters.bookingId) query = query.eq("booking_id", filters.bookingId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    booking_client_name: row.booking?.client_name_primary ?? null,
    booking: undefined,
  }));
}

export async function getBookingExpenses(bookingId: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("photographer_id", user.id)
    .eq("booking_id", bookingId)
    .order("expense_date", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Expense[];
}

export async function getYearPhotographerExpenses(year: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .eq("photographer_id", user.id)
    .eq("paid_by", "photographer")
    .gte("expense_date", `${year}-01-01`)
    .lte("expense_date", `${year}-12-31`);

  if (error) throw error;

  return (data ?? []).reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
}

export async function getBookingsForExpenseSelector(): Promise<
  Array<{ id: string; client_name_primary: string; event_date: string | null }>
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("bookings")
    .select("id, client_name_primary, event_date")
    .eq("photographer_id", user.id)
    .order("event_date", { ascending: false });

  if (error) throw error;

  return data ?? [];
}
