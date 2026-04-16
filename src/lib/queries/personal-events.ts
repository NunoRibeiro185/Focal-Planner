import { createClient } from "@/lib/supabase/server";
import type { PersonalEvent } from "@/lib/types";

export async function getPersonalEvents(
  start: string,
  end: string
): Promise<PersonalEvent[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .eq("photographer_id", user.id)
    .lte("start_date", end)
    .gte("end_date", start)
    .order("start_date", { ascending: true });

  if (error) throw error;

  return (data ?? []) as PersonalEvent[];
}

export async function getFuturePersonalEvents(): Promise<PersonalEvent[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .eq("photographer_id", user.id)
    .gte("start_date", today)
    .order("start_date", { ascending: true });

  if (error) throw error;

  return (data ?? []) as PersonalEvent[];
}

export async function getPersonalEventById(
  id: string
): Promise<PersonalEvent | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("personal_events")
    .select("*")
    .eq("id", id)
    .eq("photographer_id", user.id)
    .single();

  if (error) return null;

  return data as PersonalEvent;
}
