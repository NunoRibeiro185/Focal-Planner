"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  extraSchema,
  bookingExtraSchema,
  type ExtraValues,
  type BookingExtraValues,
} from "@/lib/types/forms";

/**
 * Creates a new extra in the photographer's catalog.
 */
export async function createExtra(values: ExtraValues) {
  const parsed = extraSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid extra data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("extras").insert({
    photographer_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    currency: parsed.data.currency,
  });

  if (error) throw error;

  revalidatePath("/packages");
}

/**
 * Updates an existing extra in the photographer's catalog.
 * Does not affect existing booking_extras snapshots.
 */
export async function updateExtra(extraId: string, values: ExtraValues) {
  const parsed = extraSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid extra data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("extras")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      currency: parsed.data.currency,
    })
    .eq("id", extraId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}

/**
 * Soft-deletes an extra from the catalog.
 * Existing booking_extras referencing this extra are unaffected (extra_id is
 * set to null via ON DELETE SET NULL, but the snapshot columns are preserved).
 */
export async function deleteExtra(extraId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("extras")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", extraId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}

/**
 * Adds an extra to a booking. Price and name are snapshotted at the time of
 * adding — future changes to the catalog do not affect this record.
 */
export async function addBookingExtra(
  bookingId: string,
  values: BookingExtraValues
) {
  const parsed = bookingExtraSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid booking extra data");

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

  const { error } = await supabase.from("booking_extras").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    extra_id: parsed.data.extra_id ?? null,
    name_snapshot: parsed.data.name_snapshot,
    price_snapshot: parsed.data.price_snapshot,
    currency_snapshot: parsed.data.currency_snapshot,
    quantity: parsed.data.quantity,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Removes an extra from a booking.
 */
export async function removeBookingExtra(
  bookingExtraId: string,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_extras")
    .delete()
    .eq("id", bookingExtraId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}
