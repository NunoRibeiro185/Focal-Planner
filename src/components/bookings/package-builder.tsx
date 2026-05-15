"use client";

import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import {
  computeSubtotal,
  computeFinalPrice,
  type BuilderLineItem,
} from "@/lib/utils/booking-builder";
import type { Service } from "@/lib/types/database";
import type { PackageTemplateWithServices } from "@/lib/types/services";

interface PackageBuilderProps {
  services: Service[];
  packages: PackageTemplateWithServices[];
  items: BuilderLineItem[];
  discount: number;
  currency: string;
  onItemsChange: (items: BuilderLineItem[]) => void;
  onDiscountChange: (discount: number) => void;
}

type AddMode = "catalog" | "custom";

export function PackageBuilder({
  services,
  packages,
  items,
  discount,
  currency,
  onItemsChange,
  onDiscountChange,
}: PackageBuilderProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("catalog");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [catalogQty, setCatalogQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const subtotal = computeSubtotal(items);
  const finalPrice = computeFinalPrice(subtotal, discount);

  function loadFromPackage(pkg: PackageTemplateWithServices) {
    const newItems: BuilderLineItem[] = pkg.services
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((ps) => ({
        service_id: ps.service_id,
        name_snapshot: ps.service.name,
        description_snapshot: ps.service.description ?? null,
        unit_price_snapshot: ps.service.unit_price,
        quantity: ps.default_quantity,
        track_completion_snapshot: ps.service.track_completion,
      }));
    onItemsChange(newItems);
    onDiscountChange(0);
  }

  function handleAddFromCatalog() {
    const errors: Record<string, string> = {};
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) errors.service = "Select a service";
    const qty = parseInt(catalogQty, 10);
    if (isNaN(qty) || qty < 1) errors.qty = "Quantity must be at least 1";
    if (Object.keys(errors).length > 0) { setAddErrors(errors); return; }

    onItemsChange([
      ...items,
      {
        service_id: service!.id,
        name_snapshot: service!.name,
        description_snapshot: service!.description ?? null,
        unit_price_snapshot: service!.unit_price,
        quantity: qty,
        track_completion_snapshot: service!.track_completion,
      },
    ]);
    setSelectedServiceId("");
    setCatalogQty("1");
    setAddErrors({});
    setShowAdd(false);
  }

  function handleAddCustom() {
    const errors: Record<string, string> = {};
    if (!customName.trim()) errors.name = "Name is required";
    const price = parseFloat(customPrice);
    if (isNaN(price) || price < 0) errors.price = "Price must be 0 or more";
    const qty = parseInt(customQty, 10);
    if (isNaN(qty) || qty < 1) errors.qty = "Quantity must be at least 1";
    if (Object.keys(errors).length > 0) { setAddErrors(errors); return; }

    onItemsChange([
      ...items,
      {
        service_id: null,
        name_snapshot: customName.trim(),
        description_snapshot: null,
        unit_price_snapshot: price,
        quantity: qty,
        track_completion_snapshot: false,
      },
    ]);
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setAddErrors({});
    setShowAdd(false);
  }

  function updateItem(index: number, patch: Partial<BuilderLineItem>) {
    onItemsChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onItemsChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {packages.length > 0 && (
        <div className="flex items-center gap-2">
          <Select onValueChange={(id) => {
            const pkg = packages.find((p) => p.id === id);
            if (pkg) loadFromPackage(pkg);
          }}>
            <SelectTrigger className="w-auto text-xs h-8">
              <SelectValue placeholder="Load from package…" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">(replaces current items)</span>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{item.name_snapshot}</span>
              </div>
              <Input
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 h-7 text-xs text-center"
                aria-label="Quantity"
              />
              <span className="text-muted-foreground text-xs">×</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price_snapshot}
                onChange={(e) => updateItem(index, { unit_price_snapshot: parseFloat(e.target.value) || 0 })}
                className="w-24 h-7 text-xs text-right"
                aria-label="Unit price"
              />
              <span className="w-20 text-right tabular-nums text-xs">
                {formatCurrency(item.unit_price_snapshot * item.quantity, currency)}
              </span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="border-t pt-2 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Discount ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount || ""}
                onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-7 text-xs w-28 ml-auto"
              />
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(finalPrice, currency)}</span>
            </div>
          </div>
        </div>
      )}

      {showAdd ? (
        <div className="rounded-md border p-3 space-y-3">
          {services.length > 0 && (
            <div className="flex gap-2">
              {(["catalog", "custom"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAddMode(m)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    addMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "catalog" ? "From catalog" : "Custom"}
                </button>
              ))}
            </div>
          )}

          {addMode === "catalog" && services.length > 0 ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Service</Label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a service…" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {formatCurrency(s.unit_price, currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {addErrors.service && <p className="text-xs text-destructive">{addErrors.service}</p>}
              </div>
              <div className="space-y-1 w-24">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={catalogQty}
                  onChange={(e) => setCatalogQty(e.target.value)}
                  className="h-8 text-xs"
                />
                {addErrors.qty && <p className="text-xs text-destructive">{addErrors.qty}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleAddFromCatalog}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddErrors({}); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Extra hour"
                  className="h-8 text-xs"
                />
                {addErrors.name && <p className="text-xs text-destructive">{addErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Price ({currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                  {addErrors.price && <p className="text-xs text-destructive">{addErrors.price}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="h-8 text-xs"
                  />
                  {addErrors.qty && <p className="text-xs text-destructive">{addErrors.qty}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleAddCustom}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddErrors({}); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add service
        </Button>
      )}
    </div>
  );
}
