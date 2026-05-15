import { createClient } from "@/lib/supabase/server";
import type { Service, BookingService } from "@/lib/types/database";

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("photographer_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getBookingServices(
  bookingId: string
): Promise<BookingService[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("booking_services")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("photographer_id", user.id)
    .order("sort_order", { ascending: true });

  return data ?? [];
}
