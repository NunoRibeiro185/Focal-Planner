"use client";

import { useState, useTransition } from "react";
import { Plus, CheckSquare, Type, Trash2 } from "lucide-react";
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
import { createCustomField, softDeleteCustomField } from "@/lib/actions/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types";

interface DeliverablesCatalogProps {
  fields: CustomFieldDefinition[];
}

export function DeliverablesCatalog({ fields }: DeliverablesCatalogProps) {
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"checkbox" | "text">("checkbox");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) {
      setError("Label is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createCustomField({ label, field_type: newType });
      setNewLabel("");
      setNewType("checkbox");
      setAdding(false);
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      await softDeleteCustomField(fieldId);
    });
  }

  if (fields.length === 0 && !adding) {
    return <DeliverablesEmptyState onAdd={() => setAdding(true)} />;
  }

  return (
    <div>
      {fields.length > 0 && (
        <div className="space-y-1 mb-8">
          {fields.map((field, i) => (
            <DeliverableRow
              key={field.id}
              field={field}
              index={i}
              isPending={isPending}
              onDelete={() => handleDelete(field.id)}
            />
          ))}
        </div>
      )}

      {adding ? (
        <div className="max-w-[480px] pt-2">
          <p
            className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-5"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            New deliverable
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="del-label" className="text-xs">
                Name
              </Label>
              <Input
                id="del-label"
                value={newLabel}
                autoFocus
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Edited gallery, Wedding album…"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as "checkbox" | "text")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkbox">
                    Checkbox — tracked as done / not done
                  </SelectItem>
                  <SelectItem value="text">
                    Text field — for a note or quantity
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {newType === "checkbox"
                  ? "Appears as a ticked checkbox on each booking — ideal for items that are either delivered or not."
                  : "Appears as a short text field on each booking — ideal for quantities or notes like “120 photos”."}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <Button onClick={handleAdd} disabled={isPending} size="sm">
                {isPending ? "Adding…" : "Add deliverable"}
              </Button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewLabel("");
                  setError(null);
                }}
                disabled={isPending}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add deliverable
        </button>
      )}
    </div>
  );
}

function DeliverableRow({
  field,
  index,
  isPending,
  onDelete,
}: {
  field: CustomFieldDefinition;
  index: number;
  isPending: boolean;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group flex items-center gap-5 py-3.5 border-b border-border/40 last:border-b-0">
      <span
        className="text-xs font-medium text-primary/40 w-5 shrink-0 tabular-nums"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        {field.field_type === "checkbox" ? (
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        ) : (
          <Type className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        )}
        <span className="text-sm text-foreground truncate">{field.label}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 shrink-0">
          {field.field_type === "checkbox" ? "checkbox" : "text"}
        </span>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        {confirming ? (
          <span className="flex items-center gap-2">
            <button
              onClick={onDelete}
              disabled={isPending}
              className="text-xs text-destructive hover:text-destructive/70 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
            <span className="text-muted-foreground/30">·</span>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            disabled={isPending}
            className="text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-50"
            aria-label={`Remove ${field.label}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
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
        <div className="flex items-start gap-4">
          <span
            className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            01
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Define your deliverables
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add anything you deliver after a shoot — edited photos, albums,
              video, film scans. Each one becomes a field on your packages.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span
            className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            02
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Attach them to packages
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              When editing a package, you choose which deliverables are
              included. They become part of that package version.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span
            className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            03
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Track them per booking
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Every booking shows its deliverables as checkboxes. Tick them off
              as you complete each one.
            </p>
          </div>
        </div>
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
