import { createClient } from "@/lib/supabase/server";
import { computeAmountPaid, computeBalance, isOverdue } from "@/lib/utils/currency";
import type { BookingWithVersion, BookingTask } from "@/lib/types";

export interface UpcomingBooking extends BookingWithVersion {
  days_until: number;
}

export interface OverdueBooking extends BookingWithVersion {
  balance: number;
}

export interface SoonTask extends BookingTask {
  booking_client: string;
}

export async function getUpcomingBookings(limit = 5): Promise<UpcomingBooking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bookings")
    .select(`*, package_version:package_versions(*)`)
    .eq("photographer_id", user.id)
    .gte("event_date", today)
    .neq("status", "cancelled")
    .neq("status", "done")
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((b) => ({
    ...b,
    days_until: b.event_date
      ? Math.ceil(
          (new Date(b.event_date).getTime() - new Date(today).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0,
  }));
}

export async function getOverdueBookings(): Promise<OverdueBooking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*, package_version:package_versions(*), payment_log_entries(amount)`
    )
    .eq("photographer_id", user.id)
    .lt("payment_due_date", today)
    .neq("status", "cancelled")
    .neq("status", "done");

  if (error) throw error;

  return (data ?? [])
    .map((b) => {
      const amountPaid = computeAmountPaid(
        (b.payment_log_entries ?? []).map((e) => e.amount)
      );
      const balance = computeBalance(b.total_price, amountPaid);
      return { ...b, balance };
    })
    .filter((b) => b.balance > 0);
}

export async function getSoonTasks(daysAhead = 7): Promise<SoonTask[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + daysAhead * 86400000)
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabase
    .from("booking_tasks")
    .select(`*, booking:bookings(client_name_primary, client_name_secondary)`)
    .eq("photographer_id", user.id)
    .eq("done", false)
    .lte("due_date", future)
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((t) => ({
    ...t,
    booking_client: [
      t.booking?.client_name_primary,
      t.booking?.client_name_secondary,
    ]
      .filter(Boolean)
      .join(" & "),
  }));
}
