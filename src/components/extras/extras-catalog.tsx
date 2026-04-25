"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES, formatCurrency } from "@/lib/utils/currency";
import { createExtra, updateExtra, deleteExtra } from "@/lib/actions/extras";
import type { Extra } from "@/lib/types";

interface ExtrasCatalogProps {
  extras: Extra[];
  defaultCurrency: string;
}

interface FieldState {
  name: string;
  description: string;
  price: string;
  currency: string;
  errors: Record<string, string>;
}

function makeEditState(extra: Extra): FieldState {
  return {
    name: extra.name,
    description: extra.description ?? "",
    price: String(extra.price),
    currency: extra.currency,
    errors: {},
  };
}

function emptyState(defaultCurrency: string): FieldState {
  return { name: "", description: "", price: "", currency: defaultCurrency, errors: {} };
}

export function ExtrasCatalog({ extras, defaultCurrency }: ExtrasCatalogProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FieldState | null>(null);
  const [adding, setAdding] = useState(extras.length === 0);
  const [addState, setAddState] = useState<FieldState>(emptyState(defaultCurrency));

  function handleAdd() {
    const errors: Record<string, string> = {};
    if (!addState.name.trim()) errors.name = "Name is required";
    if (!addState.price || isNaN(Number(addState.price)) || Number(addState.price) < 0)
      errors.price = "Enter a valid price";
    if (Object.keys(errors).length > 0) {
      setAddState({ ...addState, errors });
      return;
    }
    startTransition(async () => {
      await createExtra({
        name: addState.name.trim(),
        description: addState.description.trim() || null,
        price: Number(addState.price),
        currency: addState.currency,
      });
      setAddState(emptyState(defaultCurrency));
      setAdding(false);
    });
  }

  function handleDelete(extraId: string) {
    startTransition(async () => {
      await deleteExtra(extraId);
    });
  }

  function startEdit(extra: Extra) {
    setEditingId(extra.id);
    setEditState(makeEditState(extra));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function handleSave(extraId: string) {
    if (!editState) return;
    const errors: Record<string, string> = {};
    if (!editState.name.trim()) errors.name = "Name is required";
    if (!editState.price || isNaN(Number(editState.price)) || Number(editState.price) < 0)
      errors.price = "Enter a valid price";
    if (Object.keys(errors).length > 0) {
      setEditState({ ...editState, errors });
      return;
    }
    startTransition(async () => {
      await updateExtra(extraId, {
        name: editState.name.trim(),
        description: editState.description.trim() || null,
        price: Number(editState.price),
        currency: editState.currency,
      });
      setEditingId(null);
      setEditState(null);
    });
  }

  if (extras.length === 0 && !adding) {
    return (
      <div className="py-12 max-w-[500px]">
        <h2
          className="text-xl font-semibold mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          No extras yet
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Extras are optional add-ons clients can choose — drone footage, a second shooter,
          rush editing. Once defined here, they can be attached to any booking individually.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Add your first extra
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          alignItems: "start",
        }}
      >
        {extras.map((extra) =>
          editingId === extra.id && editState ? (
            <article
              key={extra.id}
              className="overflow-hidden rounded-sm border border-primary/40 bg-card flex flex-col"
            >
              <div className="px-5 pt-5 pb-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-4">
                  Editing
                </p>
                <ExtraForm
                  state={editState}
                  onChange={setEditState}
                  onSave={() => handleSave(extra.id)}
                  onCancel={cancelEdit}
                  isPending={isPending}
                  saveLabel="Save changes"
                />
              </div>
            </article>
          ) : (
            <ExtraCard
              key={extra.id}
              extra={extra}
              isPending={isPending}
              onEdit={() => startEdit(extra)}
              onDelete={() => handleDelete(extra.id)}
            />
          )
        )}

        {adding && (
          <article className="overflow-hidden rounded-sm border border-primary/40 bg-card flex flex-col">
            <div className="px-5 pt-5 pb-5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-4">
                New extra
              </p>
              <ExtraForm
                state={addState}
                onChange={setAddState}
                onSave={handleAdd}
                onCancel={() => {
                  setAdding(false);
                  setAddState(emptyState(defaultCurrency));
                }}
                isPending={isPending}
                saveLabel="Add to catalog"
              />
            </div>
          </article>
        )}
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
        >
          <Plus className="h-4 w-4" />
          Add extra
        </button>
      )}
    </div>
  );
}

function ExtraCard({
  extra,
  isPending,
  onEdit,
  onDelete,
}: {
  extra: Extra;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-sm border border-border/60 bg-card flex flex-col">
      <div className="flex flex-col flex-1 px-5 pt-6 pb-3">
        <h2
          className="text-lg font-semibold tracking-[-0.01em] leading-snug"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {extra.name}
        </h2>

        {extra.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-[48ch]">
            {extra.description}
          </p>
        )}

        <hr className="border-border/50 my-4" />

        <p
          className="text-2xl font-semibold text-primary leading-none"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {formatCurrency(extra.price, extra.currency)}
        </p>
      </div>

      <div className="border-t border-border/40 px-5 py-3 flex items-center gap-5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
        <button
          onClick={onEdit}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Edit
        </button>
        <DeleteExtraButton onDelete={onDelete} isPending={isPending} />
      </div>
    </article>
  );
}

interface ExtraFormProps {
  state: FieldState;
  onChange: (state: FieldState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
}

function ExtraForm({ state, onChange, onSave, onCancel, isPending, saveLabel }: ExtraFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="extra-name" className="text-xs">Name</Label>
        <Input
          id="extra-name"
          value={state.name}
          autoFocus
          onChange={(e) => onChange({ ...state, name: e.target.value, errors: {} })}
          placeholder="e.g. Drone footage"
        />
        {state.errors.name && (
          <p className="text-xs text-destructive">{state.errors.name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="extra-desc" className="text-xs">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="extra-desc"
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          placeholder="Brief description…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="extra-price" className="text-xs">Price</Label>
        <div className="flex gap-2">
          <Input
            id="extra-price"
            type="number"
            min="0"
            step="0.01"
            value={state.price}
            onChange={(e) => onChange({ ...state, price: e.target.value, errors: {} })}
            placeholder="0.00"
            className="flex-1"
          />
          <Select
            value={state.currency}
            onValueChange={(v) => onChange({ ...state, currency: v })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {state.errors.price && (
          <p className="text-xs text-destructive">{state.errors.price}</p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-1">
        <Button onClick={onSave} disabled={isPending} size="sm">
          {isPending ? "Saving…" : saveLabel}
        </Button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeleteExtraButton({
  onDelete,
  isPending,
}: {
  onDelete: () => void;
  isPending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={onDelete}
          disabled={isPending}
          className="text-xs text-destructive hover:text-destructive/70 transition-colors disabled:opacity-50"
        >
          Confirm
        </button>
        <span className="text-muted-foreground/20">·</span>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={isPending}
      className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-50"
    >
      Delete
    </button>
  );
}
