"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addPaymentEntry,
  markDepositPaid,
  deletePaymentEntry,
} from "@/lib/actions/payments";
import { updateBookingDeposit } from "@/lib/actions/bookings";
import { paymentEntrySchema, type PaymentEntryValues } from "@/lib/types/forms";
import { formatCurrency, isOverdue } from "@/lib/utils/currency";
import type { Booking, PaymentLogEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Trash2, Plus, AlertCircle, CheckCircle2, Pencil, Check, X } from "lucide-react";

interface PaymentPanelProps {
  booking: Booking;
  payments: PaymentLogEntry[];
  amountPaid: number;
  balance: number;
  overdue: boolean;
  grandTotal: number;
  currency: string;
}

export function PaymentPanel({
  booking,
  payments,
  amountPaid,
  balance,
  overdue,
  grandTotal,
  currency,
}: PaymentPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [draftDeposit, setDraftDeposit] = useState(
    booking.deposit_amount != null ? String(booking.deposit_amount) : ""
  );
  const [draftDueDate, setDraftDueDate] = useState(booking.payment_due_date ?? "");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentEntryValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentEntrySchema) as any,
    defaultValues: {
      amount: undefined,
      paid_date: new Date().toISOString().split("T")[0],
      note: null,
    },
  });

  function handleAddPayment(values: PaymentEntryValues) {
    startTransition(async () => {
      await addPaymentEntry(booking.id, values);
      reset();
      setShowAddForm(false);
    });
  }

  function handleMarkDeposit() {
    startTransition(async () => {
      await markDepositPaid(
        booking.id,
        new Date().toISOString().split("T")[0]
      );
    });
  }

  function handleDeletePayment(entryId: string) {
    startTransition(async () => {
      await deletePaymentEntry(entryId, booking.id);
    });
  }

  function handleSaveDeposit() {
    startTransition(async () => {
      await updateBookingDeposit(booking.id, {
        deposit_amount: draftDeposit !== "" ? Number(draftDeposit) : null,
        payment_due_date: draftDueDate || null,
      });
      setEditingDeposit(false);
    });
  }

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

        {/* Payment log */}
        {payments.length > 0 && (
          <div className="space-y-2">
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

        {/* Add payment form */}
        {showAddForm ? (
          <form
            onSubmit={handleSubmit(handleAddPayment)}
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
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" {...register("paid_date")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note (optional)</Label>
              <Input placeholder="e.g. Final balance" {...register("note")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            Log payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
