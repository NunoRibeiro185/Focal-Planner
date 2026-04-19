"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addPaymentEntry,
  markDepositPaid,
  deletePaymentEntry,
} from "@/lib/actions/payments";
import { updateBookingDeposit } from "@/lib/actions/bookings";
import {
  createExpense,
  deleteExpense,
  markExpenseReimbursed,
} from "@/lib/actions/expenses";
import {
  paymentEntrySchema,
  expenseFormSchema,
  EXPENSE_CATEGORY_OPTIONS,
  type PaymentEntryValues,
  type ExpenseFormValues,
} from "@/lib/types/forms";
import { formatCurrency, isOverdue } from "@/lib/utils/currency";
import { computeVat } from "@/lib/utils/expenses";
import type { Booking, PaymentLogEntry, Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Receipt,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface PaymentPanelProps {
  booking: Booking;
  payments: PaymentLogEntry[];
  bookingExpenses: Expense[];
  amountPaid: number;
  balance: number;
  overdue: boolean;
  grandTotal: number;
  currency: string;
  defaultCurrency: string;
}

export function PaymentPanel({
  booking,
  payments,
  bookingExpenses,
  amountPaid,
  balance,
  overdue,
  grandTotal,
  currency,
  defaultCurrency,
}: PaymentPanelProps) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [draftDeposit, setDraftDeposit] = useState(
    booking.deposit_amount != null ? String(booking.deposit_amount) : ""
  );
  const [draftDueDate, setDraftDueDate] = useState(booking.payment_due_date ?? "");
  const [isPending, startTransition] = useTransition();

  const paymentForm = useForm<PaymentEntryValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentEntrySchema) as any,
    defaultValues: {
      amount: undefined,
      paid_date: new Date().toISOString().split("T")[0],
      note: null,
    },
  });

  const expenseForm = useForm<ExpenseFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseFormSchema) as any,
    defaultValues: {
      category: "other",
      description: "",
      amount: undefined,
      expense_date: new Date().toISOString().split("T")[0],
      vat_percentage: null,
      paid_by: "photographer",
      booking_id: booking.id,
    },
  });

  function handleAddPayment(values: PaymentEntryValues) {
    startTransition(async () => {
      try {
        await addPaymentEntry(booking.id, values);
        paymentForm.reset();
        setShowAddPayment(false);
      } catch {
        toast.error("Couldn't add payment — try again");
      }
    });
  }

  function handleAddExpense(values: ExpenseFormValues) {
    startTransition(async () => {
      try {
        await createExpense({ ...values, booking_id: booking.id });
        expenseForm.reset({
          category: "other",
          description: "",
          amount: undefined,
          expense_date: new Date().toISOString().split("T")[0],
          vat_percentage: null,
          paid_by: "photographer",
          booking_id: booking.id,
        });
        setShowAddExpense(false);
      } catch {
        toast.error("Couldn't add expense — try again");
      }
    });
  }

  function handleMarkDeposit() {
    startTransition(async () => {
      try {
        await markDepositPaid(booking.id, new Date().toISOString().split("T")[0]);
      } catch {
        toast.error("Couldn't mark deposit as paid — try again");
      }
    });
  }

  function handleDeletePayment(entryId: string) {
    startTransition(async () => {
      try {
        await deletePaymentEntry(entryId, booking.id);
      } catch {
        toast.error("Couldn't delete payment — try again");
      }
    });
  }

  function handleDeleteExpense(expenseId: string) {
    startTransition(async () => {
      try {
        await deleteExpense(expenseId);
      } catch {
        toast.error("Couldn't delete expense — try again");
      }
    });
  }

  function handleMarkReimbursed(expenseId: string) {
    startTransition(async () => {
      try {
        await markExpenseReimbursed(expenseId, booking.id);
      } catch {
        toast.error("Couldn't mark as reimbursed — try again");
      }
    });
  }

  function handleSaveDeposit() {
    startTransition(async () => {
      try {
        await updateBookingDeposit(booking.id, {
          deposit_amount: draftDeposit !== "" ? Number(draftDeposit) : null,
          payment_due_date: draftDueDate || null,
        });
        setEditingDeposit(false);
      } catch {
        toast.error("Couldn't save deposit — try again");
      }
    });
  }

  const paidBy = expenseForm.watch("paid_by");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Payments
          </CardTitle>
          {overdue && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted/50 px-2 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Total</p>
            <p className="text-sm font-bold tabular-nums truncate">
              {formatCurrency(grandTotal, currency)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Paid</p>
            <p className="text-sm font-bold tabular-nums text-green-700 truncate">
              {formatCurrency(amountPaid, currency)}
            </p>
          </div>
          <div className={`rounded-md px-2 py-2 ${overdue ? "bg-destructive/10" : "bg-muted/50"}`}>
            <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
            <p className={`text-sm font-bold tabular-nums truncate ${overdue ? "text-destructive" : ""}`}>
              {formatCurrency(balance, currency)}
            </p>
          </div>
        </div>

        {/* Deposit & due date */}
        {editingDeposit ? (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Deposit amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draftDeposit}
                  onChange={(e) => setDraftDeposit(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Balance due date</Label>
                <Input
                  type="date"
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDeposit} disabled={isPending}>
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDeposit(false)} disabled={isPending}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {booking.deposit_amount && booking.deposit_amount > 0 ? (
              <div className="flex items-center justify-between text-sm py-1">
                <span className="text-muted-foreground">
                  Deposit ({formatCurrency(booking.deposit_amount, currency)})
                </span>
                <div className="flex items-center gap-2">
                  {booking.deposit_paid ? (
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid {booking.deposit_paid_date
                        ? format(new Date(booking.deposit_paid_date), "d MMM yyyy")
                        : ""}
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleMarkDeposit} disabled={isPending}>
                      Mark paid
                    </Button>
                  )}
                  <button
                    onClick={() => {
                      setDraftDeposit(booking.deposit_amount != null ? String(booking.deposit_amount) : "");
                      setDraftDueDate(booking.payment_due_date ?? "");
                      setEditingDeposit(true);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit deposit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDraftDeposit("");
                  setDraftDueDate("");
                  setEditingDeposit(true);
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Set deposit &amp; due date
              </button>
            )}
            {booking.payment_due_date && !editingDeposit && (
              <p className="text-xs text-muted-foreground">
                Balance due: {format(new Date(booking.payment_due_date), "d MMMM yyyy")}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Expenses (booking-linked) */}
        {bookingExpenses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Expenses
            </p>
            {bookingExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currency={defaultCurrency}
                isPending={isPending}
                onMarkReimbursed={handleMarkReimbursed}
                onDelete={handleDeleteExpense}
                bookingId={booking.id}
              />
            ))}
          </div>
        )}

        {/* Payment log */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payment log
            </p>
            {payments.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(entry.amount, currency)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(entry.paid_date), "d MMM yyyy")}
                  </span>
                  {entry.note && (
                    <span className="text-muted-foreground ml-2 italic">
                      {entry.note}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePayment(entry.id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete payment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add expense form */}
        {showAddExpense ? (
          <form
            onSubmit={expenseForm.handleSubmit(handleAddExpense)}
            className="space-y-3 pt-2 border rounded-md p-3 bg-muted/30"
          >
            <p className="text-xs font-medium">New expense</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={expenseForm.watch("category")}
                  onValueChange={(v) => expenseForm.setValue("category", v as ExpenseFormValues["category"])}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Paid by</Label>
                <Select
                  value={paidBy}
                  onValueChange={(v) => expenseForm.setValue("paid_by", v as "photographer" | "client")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photographer" className="text-xs">Me</SelectItem>
                    <SelectItem value="client" className="text-xs">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Uber to venue"
                {...expenseForm.register("description")}
              />
              {expenseForm.formState.errors.description && (
                <p className="text-xs text-destructive">{expenseForm.formState.errors.description.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount ({defaultCurrency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-8 text-xs"
                  placeholder="0.00"
                  {...expenseForm.register("amount")}
                />
                {expenseForm.formState.errors.amount && (
                  <p className="text-xs text-destructive">{expenseForm.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" className="h-8 text-xs" {...expenseForm.register("expense_date")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VAT % (optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="h-8 text-xs"
                placeholder="e.g. 23"
                {...expenseForm.register("vat_percentage")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>Add</Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddExpense(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {/* Add payment form */}
        {showAddPayment ? (
          <form
            onSubmit={paymentForm.handleSubmit(handleAddPayment)}
            className="space-y-3 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...paymentForm.register("amount")}
                />
                {paymentForm.formState.errors.amount && (
                  <p className="text-xs text-destructive">{paymentForm.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" {...paymentForm.register("paid_date")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note (optional)</Label>
              <Input placeholder="e.g. Final balance" {...paymentForm.register("note")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddPayment(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {/* Action buttons */}
        {!showAddPayment && !showAddExpense && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowAddPayment(true)}
            >
              <Plus className="h-4 w-4" />
              Log payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowAddExpense(true)}
            >
              <Receipt className="h-4 w-4" />
              Add expense
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Expense row ──────────────────────────────────────────────

interface ExpenseRowProps {
  expense: Expense;
  currency: string;
  isPending: boolean;
  onMarkReimbursed: (id: string) => void;
  onDelete: (id: string) => void;
  bookingId: string;
}

function ExpenseRow({
  expense,
  currency,
  isPending,
  onMarkReimbursed,
  onDelete,
  bookingId,
}: ExpenseRowProps) {
  const { vatAmount } = computeVat(expense.amount, expense.vat_percentage);
  const isClientPaid = expense.paid_by === "client";
  const isReimbursed = expense.reimbursed;

  return (
    <div className={`flex items-start justify-between text-sm rounded-md px-2 py-1.5 ${
      isClientPaid && !isReimbursed
        ? "bg-destructive/8 border border-destructive/20"
        : "bg-muted/30"
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-medium tabular-nums ${isClientPaid && !isReimbursed ? "text-destructive" : ""}`}>
            {formatCurrency(expense.amount, currency)}
          </span>
          <span className="text-muted-foreground text-xs">
            {format(new Date(expense.expense_date), "d MMM yyyy")}
          </span>
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {isClientPaid ? "client" : "me"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs mt-0.5 truncate">{expense.description}</p>
        {vatAmount > 0 && (
          <p className="text-[10px] text-muted-foreground">VAT: {formatCurrency(vatAmount, currency)}</p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2 shrink-0">
        {expense.auto_generated ? (
          <Link
            href={`/bookings/${bookingId}#second-shooter`}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            Edit in booking
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        ) : isClientPaid && !isReimbursed ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onMarkReimbursed(expense.id)}
              disabled={isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Reimbursed
            </Button>
            <button
              onClick={() => onDelete(expense.id)}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : isClientPaid && isReimbursed ? (
          <>
            <span className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Reimbursed
            </span>
            <button
              onClick={() => onDelete(expense.id)}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onDelete(expense.id)}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete expense"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
