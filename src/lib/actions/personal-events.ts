"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { personalEventFormSchema, type PersonalEventFormValues } from "@/lib/types/forms";
import { syncPersonalEventToGoogle, deletePersonalEventFromGoogle } from "@/lib/actions/google-calendar";

export async function createPersonalEvent(values: PersonalEventFormValues) {
  const parsed = personalEventFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid personal event data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const d = parsed.data;

  const { data, error } = await supabase
    .from("personal_events")
    .insert({
      photographer_id: user.id,
      title: d.title,
      start_date: d.start_date,
      end_date: d.end_date,
      all_day: d.all_day,
      start_time: d.start_time ?? null,
      end_time: d.end_time ?? null,
      tag: d.tag ?? null,
      color: d.color,
      notes: d.notes ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Fire-and-forget Google Calendar sync
  syncPersonalEventToGoogle(data.id, "create").catch((e) =>
    console.error("[GoogleSync] createPersonalEvent:", e)
  );

  revalidatePath("/calendar");
}

export async function updatePersonalEvent(
  id: string,
  values: PersonalEventFormValues
) {
  const parsed = personalEventFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid personal event data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const d = parsed.data;

  const { error } = await supabase
    .from("personal_events")
    .update({
      title: d.title,
      start_date: d.start_date,
      end_date: d.end_date,
      all_day: d.all_day,
      start_time: d.start_time ?? null,
      end_time: d.end_time ?? null,
      tag: d.tag ?? null,
      color: d.color,
      notes: d.notes ?? null,
    })
    .eq("id", id)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // Fire-and-forget Google Calendar sync
  syncPersonalEventToGoogle(id, "update").catch((e) =>
    console.error("[GoogleSync] updatePersonalEvent:", e)
  );

  revalidatePath("/calendar");
}

export async function deletePersonalEvent(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Read google_event_id before deleting
  const { data: event } = await supabase
    .from("personal_events")
    .select("google_event_id")
    .eq("id", id)
    .eq("photographer_id", user.id)
    .single();

  const { error } = await supabase
    .from("personal_events")
    .delete()
    .eq("id", id)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // Fire-and-forget Google Calendar delete
  if (event?.google_event_id) {
    deletePersonalEventFromGoogle(event.google_event_id).catch((e) =>
      console.error("[GoogleSync] deletePersonalEvent:", e)
    );
  }

  revalidatePath("/calendar");
}
