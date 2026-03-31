"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { itineraryStopSchema, type ItineraryStopValues } from "@/lib/types/forms";

export async function addItineraryStop(
  bookingId: string,
  values: ItineraryStopValues
) {
  const parsed = itineraryStopSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid stop data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: last } = await supabase
    .from("booking_itinerary_stops")
    .select("sort_order")
    .eq("booking_id", bookingId)
    .eq("photographer_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (last?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("booking_itinerary_stops").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    name: parsed.data.name,
    address: parsed.data.address || null,
    start_time: parsed.data.start_time || null,
    notes: parsed.data.notes || null,
    sort_order: sortOrder,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function updateItineraryStop(
  stopId: string,
  bookingId: string,
  values: ItineraryStopValues
) {
  const parsed = itineraryStopSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid stop data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_itinerary_stops")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      start_time: parsed.data.start_time || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", stopId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function deleteItineraryStop(stopId: string, bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_itinerary_stops")
    .delete()
    .eq("id", stopId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function reorderItineraryStop(
  stopId: string,
  newSortOrder: number,
  bookingId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_itinerary_stops")
    .update({ sort_order: newSortOrder })
    .eq("id", stopId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}
