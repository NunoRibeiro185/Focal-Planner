"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Stage Templates (photographer's master list) ─────────────────────────────

export async function addEditingStageTemplate(title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: last } = await supabase
    .from("editing_stage_templates")
    .select("sort_order")
    .eq("photographer_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (last?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("editing_stage_templates").insert({
    photographer_id: user.id,
    title: title.trim(),
    sort_order: sortOrder,
  });

  if (error) throw error;

  revalidatePath("/settings");
}

export async function deleteEditingStageTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("editing_stage_templates")
    .delete()
    .eq("id", templateId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/settings");
}

export async function reorderEditingStageTemplate(
  templateId: string,
  newSortOrder: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("editing_stage_templates")
    .update({ sort_order: newSortOrder })
    .eq("id", templateId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/settings");
}

// ─── Booking Editing Stages (per-booking progress) ───────────────────────────

export async function toggleBookingEditingStage(
  stageId: string,
  completed: boolean,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_editing_stages")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", stageId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/command-center");
}

export async function addBookingEditingStage(
  bookingId: string,
  title: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: last } = await supabase
    .from("booking_editing_stages")
    .select("sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (last?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("booking_editing_stages").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    title: title.trim(),
    sort_order: sortOrder,
    completed_at: null,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function deleteBookingEditingStage(
  stageId: string,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_editing_stages")
    .delete()
    .eq("id", stageId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function updateBookingEditingStage(
  stageId: string,
  title: string,
  bookingId: string
) {
  if (!title.trim()) throw new Error("Title is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_editing_stages")
    .update({ title: title.trim() })
    .eq("id", stageId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function reorderBookingEditingStage(
  stageId: string,
  newSortOrder: number,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_editing_stages")
    .update({ sort_order: newSortOrder })
    .eq("id", stageId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}
