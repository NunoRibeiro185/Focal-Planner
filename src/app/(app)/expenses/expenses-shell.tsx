"use client";

import { useState, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createExpense, updateExpense, deleteExpense } from "@/lib/actions/expenses";
import {
  expenseFormSchema,
  EXPENSE_CATEGORY_OPTIONS,
  type ExpenseFormValues,
} from "@/lib/types/forms";
import { formatCurrency } from "@/lib/utils/currency";
import { computeVat, type ExpenseSummary } from "@/lib/utils/expenses";
import type { ExpenseWithBooking } from "@/lib/queries/expenses";
import type { Expense } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, ExternalLink, Receipt } from "lucide-react";
import Link from "next/link";
import { PrefetchLink } from "@/components/ui/prefetch-link";

interface BookingOption {
  id: string;
  client_name_primary: string;
  event_date: string | null;
}

interface ExpensesShellProps {
  initialExpenses: ExpenseWithBooking[];
  bookings: BookingOption[];
  summary: ExpenseSummary;
  defaultCurrency: string;
}

// ─── Filters ─────────────────────────────────────────────────

interface Filters {
  dateFrom: string;
  dateTo: string;
  category: string;
  scope: "all" | "general" | "booking";
  bookingId: string;
}

const EMPTY_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  category: "all",
  scope: "all",
  bookingId: "all",
};

function applyFilters(
  expenses: ExpenseWithBooking[],
  filters: Filters
): ExpenseWithBooking[] {
  return expenses.filter((e) => {
    if (filters.dateFrom && e.expense_date < filters.dateFrom) return false;
    if (filters.dateTo && e.expense_date > filters.dateTo) return false;
    if (filters.category !== "all" && e.category !== filters.category) return false;
    if (filters.scope === "general" && e.booking_id !== null) return false;
    if (filters.scope === "booking" && e.booking_id === null) return false;
    if (filters.bookingId !== "all" && e.booking_id !== filters.bookingId) return false;
    return true;
  });
}

// ─── Shell ───────────────────────────────────────────────────

export function ExpensesShell({
  initialExpenses,
  bookings,
  summary,
  defaultCurrency,
}: ExpensesShellProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => applyFilters(expenses, filters), [expenses, filters]);

  // Optimistic update helpers
  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function openCreate() {
    setEditingExpense(null);
    setDialogOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id);
      removeExpense(id);
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="space-y-3">
        <div className="rounded-xl bg-card px-7 py-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
            Total Expenses
          </p>
          <p className="font-heading text-4xl font-bold tabular-nums leading-none">
            {formatCurrency(summary.totalExpenses, defaultCurrency)}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <SummaryCard
            label="Outstanding Reimbursements"
            value={formatCurrency(summary.outstandingReimbursements, defaultCurrency)}
            highlight={summary.outstandingReimbursements > 0}
          />
          <SummaryCard
            label="Total VAT"
            value={formatCurrency(summary.totalVat, defaultCurrency)}
          />
        </div>
      </div>

      {/* Filters + create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All categories</SelectItem>
                {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select
              value={filters.scope}
              onValueChange={(v) => setFilters((f) => ({ ...f, scope: v as Filters["scope"] }))}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="general" className="text-xs">General</SelectItem>
                <SelectItem value="booking" className="text-xs">Booking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Booking</Label>
            <Select
              value={filters.bookingId}
              onValueChange={(v) => setFilters((f) => ({ ...f, bookingId: v }))}
            >
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All bookings</SelectItem>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.client_name_primary}
                    {b.event_date ? ` (${format(new Date(b.event_date), "d MMM yyyy")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New expense
        </Button>
      </div>

      {/* Expenses list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Receipt className="h-8 w-8 opacity-40" />
          <p className="text-sm">No expenses found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <ExpenseListRow
              key={expense.id}
              expense={expense}
              currency={defaultCurrency}
              isPending={isPending}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
        bookings={bookings}
        defaultCurrency={defaultCurrency}
        onSaved={() => {
          // Reload handled by server revalidation; close the dialog
          setDialogOpen(false);
          setEditingExpense(null);
        }}
      />
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={`text-xl font-bold truncate ${highlight ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── List row ─────────────────────────────────────────────────

interface ExpenseListRowProps {
  expense: ExpenseWithBooking;
  currency: string;
  isPending: boolean;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}

function ExpenseListRow({
  expense,
  currency,
  isPending,
  onEdit,
  onDelete,
}: ExpenseListRowProps) {
  const { vatAmount } = computeVat(expense.amount, expense.vat_percentage);
  const categoryLabel =
    EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === expense.category)?.label ??
    expense.category;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium tabular-nums">
              {formatCurrency(expense.amount, currency)}
            </span>
            {vatAmount > 0 && (
              <span className="text-xs text-muted-foreground">
                (VAT: {formatCurrency(vatAmount, currency)})
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              {categoryLabel}
            </Badge>
            <Badge
              variant={expense.paid_by === "client" ? "secondary" : "outline"}
              className="text-xs"
            >
              {expense.paid_by === "client" ? "Client pays" : "Me"}
            </Badge>
            {expense.paid_by === "client" && (
              <Badge
                variant={expense.reimbursed ? "outline" : "destructive"}
                className="text-xs"
              >
                {expense.reimbursed ? "Reimbursed" : "Pending"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-muted-foreground text-xs flex-wrap">
            <span>{format(new Date(expense.expense_date), "d MMM yyyy")}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate">{expense.description}</span>
            {expense.booking_client_name && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <PrefetchLink
                  href={`/bookings/${expense.booking_id!}`}
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  {expense.booking_client_name}
                  <ExternalLink className="h-2.5 w-2.5" />
                </PrefetchLink>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!expense.auto_generated && (
          <>
            <button
              onClick={() => onEdit(expense)}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Edit expense"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(expense.id)}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              aria-label="Delete expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {expense.auto_generated && expense.booking_id && (
          <PrefetchLink
            href={`/bookings/${expense.booking_id!}`}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            Edit in booking
            <ExternalLink className="h-2.5 w-2.5" />
          </PrefetchLink>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense: Expense | null;
  bookings: BookingOption[];
  defaultCurrency: string;
  onSaved: () => void;
}

function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  bookings,
  defaultCurrency,
  onSaved,
}: ExpenseDialogProps) {
  const isEditing = expense !== null;
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExpenseFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseFormSchema) as any,
    defaultValues: {
      category: expense?.category ?? "other",
      description: expense?.description ?? "",
      amount: expense?.amount,
      expense_date: expense?.expense_date ?? new Date().toISOString().split("T")[0],
      vat_percentage: expense?.vat_percentage ?? null,
      paid_by: expense?.paid_by ?? "photographer",
      booking_id: expense?.booking_id ?? null,
    },
  });

  // Reset form when dialog opens with different expense
  useState(() => {
    form.reset({
      category: expense?.category ?? "other",
      description: expense?.description ?? "",
      amount: expense?.amount,
      expense_date: expense?.expense_date ?? new Date().toISOString().split("T")[0],
      vat_percentage: expense?.vat_percentage ?? null,
      paid_by: expense?.paid_by ?? "photographer",
      booking_id: expense?.booking_id ?? null,
    });
  });

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      if (isEditing) {
        await updateExpense(expense.id, values);
      } else {
        await createExpense(values);
      }
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit expense" : "New expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v as ExpenseFormValues["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Paid by</Label>
              <Select
                value={form.watch("paid_by")}
                onValueChange={(v) => form.setValue("paid_by", v as "photographer" | "client")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photographer">Me</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Description</Label>
            <Input placeholder="e.g. Flight to destination wedding" {...form.register("description")} />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Amount ({defaultCurrency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Date</Label>
              <Input type="date" {...form.register("expense_date")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">VAT % (optional)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g. 23"
              {...form.register("vat_percentage")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Linked booking (optional)</Label>
            <Select
              value={form.watch("booking_id") ?? "none"}
              onValueChange={(v) => form.setValue("booking_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (general expense)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (general expense)</SelectItem>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.client_name_primary}
                    {b.event_date ? ` · ${format(new Date(b.event_date), "d MMM yyyy")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEditing ? "Save changes" : "Add expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
