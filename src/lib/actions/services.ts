"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  serviceSchema,
  bookingServiceSchema,
  type ServiceValues,
  type BookingServiceValues,
} from "@/lib/types/forms";

/**
 * Creates a new service in the photographer's catalog.
 */
export async function createService(values: ServiceValues) {
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid service data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("services").insert({
    photographer_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    unit_price: parsed.data.unit_price,
    track_completion: parsed.data.track_completion,
  });

  if (error) throw error;

  revalidatePath("/packages");
}

/**
 * Updates an existing service in the photographer's catalog.
 * Does not affect existing booking_services snapshots.
 */
export async function updateService(
  serviceId: string,
  values: ServiceValues
) {
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid service data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      unit_price: parsed.data.unit_price,
      track_completion: parsed.data.track_completion,
    })
    .eq("id", serviceId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}

/**
 * Soft-deletes a service from the catalog.
 * Existing booking_services referencing this service are unaffected (service_id is
 * set to null via ON DELETE SET NULL, but the snapshot columns are preserved).
 */
export async function softDeleteService(serviceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("services")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}

/**
 * Adds a service to a booking. Name, description, price, and track_completion are snapshotted at the time of
 * adding — future changes to the catalog do not affect this record.
 */
export async function addBookingService(
  bookingId: string,
  values: BookingServiceValues
) {
  const parsed = bookingServiceSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid booking service data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Verify booking ownership
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (bookingError || !booking) throw new Error("Booking not found");

  // Get the next sort_order
  const { data: existing } = await supabase
    .from("booking_services")
    .select("sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("booking_services").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    service_id: parsed.data.service_id ?? null,
    name_snapshot: parsed.data.name_snapshot,
    description_snapshot: parsed.data.description_snapshot ?? null,
    unit_price_snapshot: parsed.data.unit_price_snapshot,
    quantity: parsed.data.quantity,
    track_completion_snapshot: parsed.data.track_completion_snapshot,
    done: false,
    sort_order: nextOrder,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Removes a service from a booking.
 */
export async function removeBookingService(
  bookingServiceId: string,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_services")
    .delete()
    .eq("id", bookingServiceId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Toggles the completion status of a booking service.
 */
export async function toggleBookingService(
  bookingServiceId: string,
  done: boolean,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_services")
    .update({ done })
    .eq("id", bookingServiceId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}
