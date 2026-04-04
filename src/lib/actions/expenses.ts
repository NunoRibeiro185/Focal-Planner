"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/types/forms";

// ─── Create ───────────────────────────────────────────────────

export async function createExpense(values: ExpenseFormValues): Promise<void> {
  const parsed = expenseFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid expense data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch the photographer's default currency
  const { data: photographer, error: pgErr } = await supabase
    .from("photographers")
    .select("default_currency")
    .eq("id", user.id)
    .single();
  if (pgErr || !photographer) throw new Error("Photographer not found");

  const { error } = await supabase.from("expenses").insert({
    photographer_id: user.id,
    booking_id: parsed.data.booking_id,
    category: parsed.data.category,
    description: parsed.data.description,
    amount: parsed.data.amount,
    currency: photographer.default_currency,
    expense_date: parsed.data.expense_date,
    vat_percentage: parsed.data.vat_percentage,
    paid_by: parsed.data.paid_by,
    reimbursed: false,
    auto_generated: false,
  });

  if (error) throw error;

  revalidatePath("/expenses");
  if (parsed.data.booking_id) {
    revalidatePath(`/bookings/${parsed.data.booking_id}`);
  }
}

// ─── Update ───────────────────────────────────────────────────

export async function updateExpense(
  expenseId: string,
  values: ExpenseFormValues
): Promise<void> {
  const parsed = expenseFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid expense data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch existing expense to verify ownership and get booking_id for revalidation
  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("booking_id, auto_generated")
    .eq("id", expenseId)
    .eq("photographer_id", user.id)
    .single();

  if (fetchErr || !existing) throw new Error("Expense not found");
  if (existing.auto_generated) throw new Error("Auto-generated expenses cannot be edited");

  const { error } = await supabase
    .from("expenses")
    .update({
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expense_date: parsed.data.expense_date,
      vat_percentage: parsed.data.vat_percentage,
      paid_by: parsed.data.paid_by,
      booking_id: parsed.data.booking_id,
    })
    .eq("id", expenseId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/expenses");
  const bookingId = parsed.data.booking_id ?? existing.booking_id;
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
}

// ─── Delete ───────────────────────────────────────────────────

export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("booking_id, auto_generated, paid_by, reimbursed, description")
    .eq("id", expenseId)
    .eq("photographer_id", user.id)
    .single();

  if (fetchErr || !existing) throw new Error("Expense not found");
  if (existing.auto_generated) throw new Error("Auto-generated expenses cannot be deleted directly");

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // If this expense was reimbursed, its payment log entry is now orphaned — remove it
  if (existing.reimbursed && existing.paid_by === "client" && existing.booking_id) {
    await supabase
      .from("payment_log_entries")
      .delete()
      .eq("booking_id", existing.booking_id)
      .eq("photographer_id", user.id)
      .eq("note", `Expense reimbursed: ${existing.description}`);
  }

  revalidatePath("/expenses");
  if (existing.booking_id) revalidatePath(`/bookings/${existing.booking_id}`);
}

// ─── Mark reimbursed (atomic: flip flag + log payment) ────────

/**
 * Marks a client-paid expense as reimbursed and inserts a payment log entry
 * for the same amount so the booking balance is reduced automatically.
 */
export async function markExpenseReimbursed(
  expenseId: string,
  bookingId: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch expense — validates ownership and confirms it's client-paid + unreimbursed
  const { data: expense, error: fetchErr } = await supabase
    .from("expenses")
    .select("amount, paid_by, reimbursed, description")
    .eq("id", expenseId)
    .eq("booking_id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (fetchErr || !expense) throw new Error("Expense not found");
  if (expense.paid_by !== "client") throw new Error("Only client-paid expenses can be reimbursed");
  if (expense.reimbursed) return; // idempotent

  // 1. Mark as reimbursed
  const { error: updateErr } = await supabase
    .from("expenses")
    .update({ reimbursed: true })
    .eq("id", expenseId)
    .eq("photographer_id", user.id);

  if (updateErr) throw updateErr;

  // 2. Insert a payment log entry so the balance reflects the reimbursement
  const { error: logErr } = await supabase
    .from("payment_log_entries")
    .insert({
      booking_id: bookingId,
      photographer_id: user.id,
      amount: expense.amount,
      paid_date: new Date().toISOString().split("T")[0],
      note: `Expense reimbursed: ${expense.description}`,
    });

  if (logErr) throw logErr;

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/expenses");
}

// ─── Internal: auto-sync for 2nd shooter expense ─────────────

/**
 * Upserts the auto-generated 2nd shooter expense for a booking.
 * Called internally when a second shooter fee is set or updated.
 */
export async function upsertSecondShooterExpense(
  bookingId: string,
  photographerId: string,
  fee: number,
  currency: string
): Promise<void> {
  const supabase = await createClient();

  // Use upsert by matching the unique combo: booking + auto_generated + category
  const { data: existing } = await supabase
    .from("expenses")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("photographer_id", photographerId)
    .eq("auto_generated", true)
    .eq("category", "second_shooter")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("expenses")
      .update({ amount: fee, currency })
      .eq("id", existing.id);
  } else {
    await supabase.from("expenses").insert({
      photographer_id: photographerId,
      booking_id: bookingId,
      category: "second_shooter",
      description: "2nd shooter fee",
      amount: fee,
      currency,
      expense_date: new Date().toISOString().split("T")[0],
      paid_by: "photographer",
      reimbursed: false,
      auto_generated: true,
    });
  }

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Deletes the auto-generated 2nd shooter expense for a booking.
 * Called internally when a second shooter is removed.
 */
export async function deleteSecondShooterExpense(
  bookingId: string,
  photographerId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("expenses")
    .delete()
    .eq("booking_id", bookingId)
    .eq("photographer_id", photographerId)
    .eq("auto_generated", true)
    .eq("category", "second_shooter");

  revalidatePath(`/bookings/${bookingId}`);
}
