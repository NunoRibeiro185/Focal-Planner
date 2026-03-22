import { createClient } from "@/lib/supabase/server";
import type { GoogleCalendarToken } from "@/lib/types";

/**
 * Returns the Google Calendar token for the current user, or null if not connected.
 */
export async function getGoogleCalendarToken(): Promise<GoogleCalendarToken | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("photographer_id", user.id)
    .single();

  return (data as GoogleCalendarToken) ?? null;
}
