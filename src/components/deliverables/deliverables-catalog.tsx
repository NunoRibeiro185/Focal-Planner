"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomField, updateCustomField, softDeleteCustomField } from "@/lib/actions/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types";

interface DeliverablesCatalogProps {
  fields: CustomFieldDefinition[];
}

interface FieldState {
  label: string;
  description: string;
  errors: Record<string, string>;
}

function emptyState(): FieldState {
  return { label: "", description: "", errors: {} };
}

function makeEditState(field: CustomFieldDefinition): FieldState {
  return { label: field.label, description: field.description ?? "", errors: {} };
}

export function DeliverablesCatalog({ fields }: DeliverablesCatalogProps) {
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [addState, setAddState] = useState<FieldState>(emptyState());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FieldState | null>(null);

  function handleAdd() {
    const errors: Record<string, string> = {};
    if (!addState.label.trim()) errors.label = "Name is required";
    if (Object.keys(errors).length > 0) {
      setAddState({ ...addState, errors });
      return;
    }
    startTransition(async () => {
      await createCustomField({
        label: addState.label.trim(),
        description: addState.description.trim() || null,
      });
      setAddState(emptyState());
      setAdding(false);
    });
  }

  function handleSave(fieldId: string) {
    if (!editState) return;
    const errors: Record<string, string> = {};
    if (!editState.label.trim()) errors.label = "Name is required";
    if (Object.keys(errors).length > 0) {
      setEditState({ ...editState, errors });
      return;
    }
    startTransition(async () => {
      await updateCustomField(fieldId, {
        label: editState.label.trim(),
        description: editState.description.trim() || null,
      });
      setEditingId(null);
      setEditState(null);
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      await softDeleteCustomField(fieldId);
    });
  }

  function startEdit(field: CustomFieldDefinition) {
    setEditingId(field.id);
    setEditState(makeEditState(field));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  if (fields.length === 0 && !adding) {
    return <DeliverablesEmptyState onAdd={() => setAdding(true)} />;
  }

  return (
    <div>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", alignItems: "start" }}
      >
        {fields.map((field) =>
          editingId === field.id && editState ? (
            <article
              key={field.id}
              className="overflow-hidden rounded-sm border border-primary/40 bg-card flex flex-col"
            >
              <div className="px-5 pt-5 pb-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-4">
                  Editing
                </p>
                <DeliverableForm
                  state={editState}
                  onChange={setEditState}
                  onSave={() => handleSave(field.id)}
                  onCancel={cancelEdit}
                  isPending={isPending}
                  saveLabel="Save changes"
                />
              </div>
            </article>
          ) : (
            <DeliverableCard
              key={field.id}
              field={field}
              isPending={isPending}
              onEdit={() => startEdit(field)}
              onDelete={() => handleDelete(field.id)}
            />
          )
        )}

        {adding && (
          <article className="overflow-hidden rounded-sm border border-primary/40 bg-card flex flex-col">
            <div className="px-5 pt-5 pb-5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-4">
                New deliverable
              </p>
              <DeliverableForm
                state={addState}
                onChange={setAddState}
                onSave={handleAdd}
                onCancel={() => {
                  setAdding(false);
                  setAddState(emptyState());
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
          Add deliverable
        </button>
      )}
    </div>
  );
}

function DeliverableCard({
  field,
  isPending,
  onEdit,
  onDelete,
}: {
  field: CustomFieldDefinition;
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
          {field.label}
        </h2>
        {field.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-[48ch]">
            {field.description}
          </p>
        )}
      </div>
      <div className="border-t border-border/40 px-5 py-3 flex items-center gap-5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
        <button
          onClick={onEdit}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Edit
        </button>
        <DeleteDeliverableButton onDelete={onDelete} isPending={isPending} />
      </div>
    </article>
  );
}

function DeliverableForm({
  state,
  onChange,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: {
  state: FieldState;
  onChange: (s: FieldState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="del-label" className="text-xs">Name</Label>
        <Input
          id="del-label"
          value={state.label}
          autoFocus
          onChange={(e) => onChange({ ...state, label: e.target.value, errors: {} })}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          placeholder="e.g. Edited gallery, Wedding album…"
        />
        {state.errors.label && (
          <p className="text-xs text-destructive">{state.errors.label}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="del-desc" className="text-xs">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="del-desc"
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          placeholder="Brief description…"
        />
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

function DeleteDeliverableButton({
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

function DeliverablesEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-12 max-w-[500px]">
      <h2
        className="text-xl font-semibold mb-3"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        No deliverables yet
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Deliverables are the items you promise to every client — an edited
        gallery, a wedding album, a highlight reel. Define them once here and
        they appear as trackable fields on every booking.
      </p>
      <div className="space-y-5 mb-8">
        <EmptyStep number="01" title="Define your deliverables">
          Give each one a name and an optional description. They live here as a
          reusable catalog — not tied to any single package.
        </EmptyStep>
        <EmptyStep number="02" title="Attach to packages">
          When editing a package, check which deliverables are included. They
          become part of that package version.
        </EmptyStep>
        <EmptyStep number="03" title="Track them per booking">
          Every booking shows its deliverables as checkboxes. Tick them off as
          you complete each one.
        </EmptyStep>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        <Plus className="h-4 w-4" />
        Create your first deliverable
      </button>
    </div>
  );
}

function EmptyStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {number}
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
