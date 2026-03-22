import { createClient } from "@/lib/supabase/server";
import type { PersonalEvent } from "@/lib/types";

/**
 * Returns personal events that overlap the given date range.
 * An event overlaps if its start_date <= end AND its end_date >= start.
 */
export async function getPersonalEvents(
  start: string,
  end: string
): Promise<PersonalEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .lte("start_date", end)
    .gte("end_date", start)
    .order("start_date", { ascending: true });

  if (error) throw error;

  return (data ?? []) as PersonalEvent[];
}

/**
 * Returns all future personal events (start_date >= today).
 */
export async function getFuturePersonalEvents(): Promise<PersonalEvent[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .gte("start_date", today)
    .order("start_date", { ascending: true });

  if (error) throw error;

  return (data ?? []) as PersonalEvent[];
}

/**
 * Returns a single personal event by id.
 */
export async function getPersonalEventById(
  id: string
): Promise<PersonalEvent | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;

  return data as PersonalEvent;
}
