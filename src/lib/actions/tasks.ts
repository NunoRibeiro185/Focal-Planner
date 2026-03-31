"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { taskSchema, type TaskValues } from "@/lib/types/forms";

/**
 * Revalidates the command center and, when a bookingId is provided,
 * the relevant booking detail page too.
 */
function revalidateTaskPaths(bookingId: string | null) {
  revalidatePath("/command-center");
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
}

export async function addBookingTask(bookingId: string | null, values: TaskValues) {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid task data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get max sort_order within the same scope (booking or general)
  const sortQuery = supabase
    .from("booking_tasks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data: last } = await (bookingId
    ? sortQuery.eq("booking_id", bookingId)
    : sortQuery.is("booking_id", null)
  ).single();

  const sortOrder = (last?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("booking_tasks").insert({
    booking_id: bookingId ?? null,
    photographer_id: user.id,
    title: parsed.data.title,
    due_date: parsed.data.due_date ?? null,
    sort_order: sortOrder,
  });

  if (error) throw error;

  revalidateTaskPaths(bookingId);
}

export async function toggleBookingTask(
  taskId: string,
  done: boolean,
  bookingId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_tasks")
    .update({ done })
    .eq("id", taskId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidateTaskPaths(bookingId);
}

export async function deleteBookingTask(taskId: string, bookingId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_tasks")
    .delete()
    .eq("id", taskId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidateTaskPaths(bookingId);
}

export async function updateBookingTask(
  taskId: string,
  values: TaskValues,
  bookingId: string | null
) {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid task data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_tasks")
    .update({ title: parsed.data.title, due_date: parsed.data.due_date ?? null })
    .eq("id", taskId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidateTaskPaths(bookingId);
}

export async function reorderBookingTask(
  taskId: string,
  newSortOrder: number,
  bookingId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_tasks")
    .update({ sort_order: newSortOrder })
    .eq("id", taskId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidateTaskPaths(bookingId);
}

export async function updateDeliverableStatus(
  deliverableId: string,
  status: string,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("deliverable_statuses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", deliverableId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}
