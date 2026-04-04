"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { paymentEntrySchema, type PaymentEntryValues } from "@/lib/types/forms";

/**
 * Adds a payment log entry for a booking.
 */
export async function addPaymentEntry(
  bookingId: string,
  values: PaymentEntryValues
) {
  const parsed = paymentEntrySchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid payment data");

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

  const { error } = await supabase.from("payment_log_entries").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    amount: parsed.data.amount,
    paid_date: parsed.data.paid_date,
    note: parsed.data.note ?? null,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Marks the deposit as paid. Also inserts a payment log entry so
 * the running total stays accurate. Atomic — both operations must succeed.
 */
export async function markDepositPaid(bookingId: string, paidDate: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch deposit amount
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("deposit_amount, deposit_paid")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (fetchError || !booking) throw new Error("Booking not found");
  if (booking.deposit_paid) return; // idempotent

  const depositAmount = booking.deposit_amount;
  if (!depositAmount || depositAmount <= 0)
    throw new Error("No deposit amount set");

  // Update deposit_paid flag
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ deposit_paid: true, deposit_paid_date: paidDate })
    .eq("id", bookingId);

  if (updateError) throw updateError;

  // Insert log entry
  const { error: logError } = await supabase
    .from("payment_log_entries")
    .insert({
      booking_id: bookingId,
      photographer_id: user.id,
      amount: depositAmount,
      paid_date: paidDate,
      note: "Deposit",
    });

  if (logError) throw logError;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Deletes a payment log entry.
 * If the entry was the deposit payment (note === "Deposit"), also resets
 * the booking's deposit_paid flag so the user can re-mark it.
 */
export async function deletePaymentEntry(entryId: string, bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch first so we know whether this was the deposit entry
  const { data: entry } = await supabase
    .from("payment_log_entries")
    .select("note")
    .eq("id", entryId)
    .eq("photographer_id", user.id)
    .single();

  const { error } = await supabase
    .from("payment_log_entries")
    .delete()
    .eq("id", entryId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // If this was the deposit log entry, clear the deposit_paid flag
  if (entry?.note === "Deposit") {
    await supabase
      .from("bookings")
      .update({ deposit_paid: false, deposit_paid_date: null })
      .eq("id", bookingId)
      .eq("photographer_id", user.id);
  }

  // If this was an expense-reimbursement log entry, reset the expense's reimbursed flag
  if (entry?.note?.startsWith("Expense reimbursed: ")) {
    const description = entry.note.slice("Expense reimbursed: ".length);
    await supabase
      .from("expenses")
      .update({ reimbursed: false })
      .eq("booking_id", bookingId)
      .eq("photographer_id", user.id)
      .eq("description", description)
      .eq("reimbursed", true);
  }

  revalidatePath(`/bookings/${bookingId}`);
}
