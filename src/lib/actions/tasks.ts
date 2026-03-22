"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { taskSchema, type TaskValues } from "@/lib/types/forms";

export async function addBookingTask(bookingId: string, values: TaskValues) {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid task data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get max sort_order for this booking
  const { data: last } = await supabase
    .from("booking_tasks")
    .select("sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = ((last?.sort_order ?? 0) + 10);

  const { error } = await supabase.from("booking_tasks").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    title: parsed.data.title,
    due_date: parsed.data.due_date ?? null,
    sort_order: sortOrder,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function toggleBookingTask(taskId: string, done: boolean, bookingId: string) {
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

  revalidatePath(`/bookings/${bookingId}`);
}

export async function deleteBookingTask(taskId: string, bookingId: string) {
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

  revalidatePath(`/bookings/${bookingId}`);
}

export async function reorderBookingTask(
  taskId: string,
  newSortOrder: number,
  bookingId: string
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

  revalidatePath(`/bookings/${bookingId}`);
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
