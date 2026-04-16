import { createClient } from "@/lib/supabase/server";
import type { Extra, BookingExtra } from "@/lib/types";

export async function getExtras(): Promise<Extra[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("extras")
    .select("*")
    .eq("photographer_id", user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Extra[];
}

export async function getBookingExtras(bookingId: string): Promise<BookingExtra[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("booking_extras")
    .select("*")
    .eq("photographer_id", user.id)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as BookingExtra[];
}
