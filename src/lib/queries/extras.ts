import { createClient } from "@/lib/supabase/server";
import type { Extra, BookingExtra } from "@/lib/types";

/**
 * Returns all active (non-deleted) extras for the current photographer,
 * ordered by name.
 */
export async function getExtras(): Promise<Extra[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("extras")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Extra[];
}

/**
 * Returns all booking extras for a given booking.
 */
export async function getBookingExtras(bookingId: string): Promise<BookingExtra[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("booking_extras")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as BookingExtra[];
}
