"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface EditState {
  name: string;
  description: string;
  price: string;
  currency: string;
  errors: Record<string, string>;
}

function makeEditState(extra: Extra): EditState {
  return {
    name: extra.name,
    description: extra.description ?? "",
    price: String(extra.price),
    currency: extra.currency,
    errors: {},
  };
}

export function ExtrasCatalog({ extras, defaultCurrency }: ExtrasCatalogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  function handleAdd() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!price || isNaN(Number(price)) || Number(price) < 0)
      newErrors.price = "Enter a valid price";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      await createExtra({
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        currency,
      });
      setName("");
      setDescription("");
      setPrice("");
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
    const newErrors: Record<string, string> = {};
    if (!editState.name.trim()) newErrors.name = "Name is required";
    if (!editState.price || isNaN(Number(editState.price)) || Number(editState.price) < 0)
      newErrors.price = "Enter a valid price";
    if (Object.keys(newErrors).length > 0) {
      setEditState({ ...editState, errors: newErrors });
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

  return (
    <div className="space-y-6">
      {/* Existing extras */}
      {extras.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {extras.map((extra) =>
            editingId === extra.id && editState ? (
              <Card key={extra.id} className="flex flex-col">
                <CardContent className="pt-4 pb-3 flex-1 flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={editState.name}
                      onChange={(e) =>
                        setEditState({ ...editState, name: e.target.value, errors: {} })
                      }
                    />
                    {editState.errors.name && (
                      <p className="text-xs text-destructive">{editState.errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      value={editState.description}
                      onChange={(e) =>
                        setEditState({ ...editState, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editState.price}
                        onChange={(e) =>
                          setEditState({ ...editState, price: e.target.value, errors: {} })
                        }
                      />
                      {editState.errors.price && (
                        <p className="text-xs text-destructive">{editState.errors.price}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <Select
                        value={editState.currency}
                        onValueChange={(v) =>
                          setEditState({ ...editState, currency: v })
                        }
                      >
                        <SelectTrigger>
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(extra.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={extra.id} className="flex flex-col">
                <CardContent className="pt-4 pb-3 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{extra.name}</p>
                      {extra.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {extra.description}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary shrink-0">
                      {formatCurrency(extra.price, extra.currency)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(extra)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(extra.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors self-start disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No extras in your catalog yet. Add one below.
        </p>
      )}

      {/* Add new extra */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Add Extra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="extra-name">Name</Label>
            <Input
              id="extra-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drone footage"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="extra-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="extra-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="extra-price">Price</Label>
              <Input
                id="extra-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
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
          </div>

          <Button onClick={handleAdd} disabled={isPending} size="sm">
            <Plus className="h-4 w-4" />
            {isPending ? "Adding…" : "Add to catalog"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
