import { createClient } from "@/lib/supabase/server";
import type { Booking, BookingTask, BookingEditingStage, EditingStageTemplate } from "@/lib/types";

export interface NextWeddingData {
  booking: Booking & { days_until: number };
  incompleteTasks: BookingTask[];
}

export interface EditingBenchItem {
  booking: Booking;
  stages: BookingEditingStage[];
  progress: number;
}

export interface CommandCenterTask extends BookingTask {
  booking_client: string;
}

/** The next upcoming non-cancelled, non-done booking with its incomplete tasks */
export async function getNextWedding(): Promise<NextWeddingData | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .gte("event_date", today)
    .neq("status", "cancelled")
    .neq("status", "done")
    .neq("status", "inquiry")
    .order("event_date", { ascending: true })
    .limit(1)
    .single();

  if (error || !booking) return null;

  const { data: tasks } = await supabase
    .from("booking_tasks")
    .select("*")
    .eq("booking_id", booking.id)
    .eq("done", false)
    .order("due_date", { ascending: true, nullsFirst: false });

  const daysUntil = Math.ceil(
    (new Date(booking.event_date).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return {
    booking: { ...booking, days_until: daysUntil } as Booking & { days_until: number },
    incompleteTasks: (tasks ?? []) as BookingTask[],
  };
}

/** All bookings currently in "editing" status with their stage progress */
export async function getEditingBench(): Promise<EditingBenchItem[]> {
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "editing")
    .order("event_date", { ascending: true });

  if (error) throw error;
  if (!bookings || bookings.length === 0) return [];

  const bookingIds = bookings.map((b: any) => b.id);

  const { data: allStages } = await supabase
    .from("booking_editing_stages")
    .select("*")
    .in("booking_id", bookingIds)
    .order("sort_order", { ascending: true });

  return bookings.map((booking: any) => {
    const stages = (allStages ?? []).filter(
      (s: any) => s.booking_id === booking.id
    ) as BookingEditingStage[];
    const completed = stages.filter((s) => s.completed_at !== null).length;
    const progress =
      stages.length > 0 ? Math.round((completed / stages.length) * 100) : 0;
    return { booking: booking as Booking, stages, progress };
  });
}

/**
 * Incomplete booking tasks grouped by urgency:
 * - thisWeek: due_date within the next 7 days (or today)
 * - upcoming: due_date beyond 7 days, or no due_date
 */
export async function getCommandCenterTasks(): Promise<{
  thisWeek: CommandCenterTask[];
  upcoming: CommandCenterTask[];
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("booking_tasks")
    .select(`*, booking:bookings(client_name_primary, client_name_secondary)`)
    .eq("done", false)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;

  const toTask = (t: any): CommandCenterTask => ({
    ...t,
    booking_client: [
      t.booking?.client_name_primary,
      t.booking?.client_name_secondary,
    ]
      .filter(Boolean)
      .join(" & "),
  });

  const thisWeek: CommandCenterTask[] = [];
  const upcoming: CommandCenterTask[] = [];

  for (const t of data ?? []) {
    const task = toTask(t);
    if (t.due_date && t.due_date >= today && t.due_date <= weekEnd) {
      thisWeek.push(task);
    } else {
      upcoming.push(task);
    }
  }

  return { thisWeek, upcoming };
}

/** All bookings with status "inquiry" */
export async function getOpenInquiries(): Promise<Booking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "inquiry")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Booking[];
}

/** Editing stage templates for the current photographer */
export async function getEditingStageTemplates(): Promise<EditingStageTemplate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("editing_stage_templates")
    .select("*")
    .eq("photographer_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []) as EditingStageTemplate[];
}

/** Editing stages for a specific booking */
export async function getBookingEditingStages(
  bookingId: string
): Promise<BookingEditingStage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_editing_stages")
    .select("*")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []) as BookingEditingStage[];
}
