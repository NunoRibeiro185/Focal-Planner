"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import {
  createService,
  updateService,
  softDeleteService,
} from "@/lib/actions/services";
import type { Service } from "@/lib/types/database";

interface ServicesCatalogProps {
  services: Service[];
  defaultCurrency: string;
}

interface FieldState {
  name: string;
  description: string;
  unit_price: string;
  track_completion: boolean;
  errors: Record<string, string>;
}

const emptyField = (): FieldState => ({
  name: "",
  description: "",
  unit_price: "0",
  track_completion: false,
  errors: {},
});

function validate(f: FieldState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.name.trim()) errors.name = "Name is required";
  const price = parseFloat(f.unit_price);
  if (isNaN(price) || price < 0) errors.unit_price = "Price must be 0 or more";
  return errors;
}

export function ServicesCatalog({ services, defaultCurrency }: ServicesCatalogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FieldState>(emptyField());
  const [showAdd, setShowAdd] = useState(false);
  const [addState, setAddState] = useState<FieldState>(emptyField());

  async function handleCreate() {
    const errors = validate(addState);
    if (Object.keys(errors).length > 0) {
      setAddState((s) => ({ ...s, errors }));
      return;
    }
    await createService({
      name: addState.name.trim(),
      description: addState.description.trim() || null,
      unit_price: parseFloat(addState.unit_price),
      track_completion: addState.track_completion,
    });
    setAddState(emptyField());
    setShowAdd(false);
  }

  async function handleUpdate(serviceId: string) {
    const errors = validate(editState);
    if (Object.keys(errors).length > 0) {
      setEditState((s) => ({ ...s, errors }));
      return;
    }
    await updateService(serviceId, {
      name: editState.name.trim(),
      description: editState.description.trim() || null,
      unit_price: parseFloat(editState.unit_price),
      track_completion: editState.track_completion,
    });
    setEditingId(null);
  }

  async function handleDelete(serviceId: string) {
    if (!confirm("Remove this service from your catalog? Existing bookings are unaffected.")) return;
    await softDeleteService(serviceId);
  }

  function startEdit(service: Service) {
    setEditingId(service.id);
    setEditState({
      name: service.name,
      description: service.description ?? "",
      unit_price: String(service.unit_price),
      track_completion: service.track_completion,
      errors: {},
    });
  }

  if (services.length === 0 && !showAdd) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <p className="text-muted-foreground">No services yet.</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add your services — photography packages, albums, drone footage, film rolls — each with a price. These become the building blocks for every booking.
        </p>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add first service
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) =>
          editingId === service.id ? (
            <ServiceForm
              key={service.id}
              state={editState}
              onChange={setEditState}
              onSave={() => handleUpdate(service.id)}
              onCancel={() => setEditingId(null)}
              defaultCurrency={defaultCurrency}
            />
          ) : (
            <ServiceCard
              key={service.id}
              service={service}
              defaultCurrency={defaultCurrency}
              onEdit={() => startEdit(service)}
              onDelete={() => handleDelete(service.id)}
            />
          )
        )}

        {showAdd && (
          <ServiceForm
            state={addState}
            onChange={setAddState}
            onSave={handleCreate}
            onCancel={() => { setShowAdd(false); setAddState(emptyField()); }}
            defaultCurrency={defaultCurrency}
          />
        )}
      </div>

      {!showAdd && (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add service
        </Button>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  defaultCurrency,
  onEdit,
  onDelete,
}: {
  service: Service;
  defaultCurrency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative rounded-lg border p-4 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug">{service.name}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-muted"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
      {service.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(service.unit_price, defaultCurrency)}
        </span>
        {service.track_completion && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Tracked
          </span>
        )}
      </div>
    </div>
  );
}

function ServiceForm({
  state,
  onChange,
  onSave,
  onCancel,
  defaultCurrency,
}: {
  state: FieldState;
  onChange: (s: FieldState) => void;
  onSave: () => void;
  onCancel: () => void;
  defaultCurrency: string;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={state.name}
          onChange={(e) => onChange({ ...state, name: e.target.value, errors: { ...state.errors, name: "" } })}
          placeholder="e.g. Wedding Album"
        />
        {state.errors.name && <p className="text-xs text-destructive">{state.errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          rows={2}
          placeholder="Brief description…"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Price ({defaultCurrency})</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={state.unit_price}
          onChange={(e) => onChange({ ...state, unit_price: e.target.value, errors: { ...state.errors, unit_price: "" } })}
          placeholder="0.00"
        />
        {state.errors.unit_price && <p className="text-xs text-destructive">{state.errors.unit_price}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="track_completion"
          checked={state.track_completion}
          onCheckedChange={(v) => onChange({ ...state, track_completion: v })}
        />
        <Label htmlFor="track_completion" className="text-xs cursor-pointer">
          Track delivery (adds a completion checkbox per booking)
        </Label>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" size="sm" onClick={onSave}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
