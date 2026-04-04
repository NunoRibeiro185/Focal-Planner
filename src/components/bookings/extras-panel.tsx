"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Clock, Pencil, Check, X, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { addBookingExtra, removeBookingExtra } from "@/lib/actions/extras";
import {
  updateBookingPackage,
  updateBookingPricing,
} from "@/lib/actions/bookings";
import type { BookingExtra, BookingWithVersion, Extra } from "@/lib/types";
import type { PackageTemplateWithVersion } from "@/lib/types";

interface ExtrasPanelProps {
  bookingId: string;
  extras: BookingExtra[];
  catalogExtras: Extra[];
  currency: string;
}

type AddMode = "catalog" | "custom";

export function ExtrasPanel({
  bookingId,
  extras,
  catalogExtras,
  currency,
}: ExtrasPanelProps) {
  const [mode, setMode] = useState<AddMode>("catalog");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Catalog mode state
  const [selectedExtraId, setSelectedExtraId] = useState<string>("");
  const [catalogQty, setCatalogQty] = useState("1");

  // Custom mode state
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCurrency, setCustomCurrency] = useState(currency);
  const [customQty, setCustomQty] = useState("1");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const extrasSubtotal = extras.reduce(
    (sum, e) => sum + e.price_snapshot * e.quantity,
    0
  );

  function handleAdd() {
    const newErrors: Record<string, string> = {};

    if (mode === "catalog") {
      if (!selectedExtraId) {
        newErrors.extra = "Select an extra";
      }
      const qty = Number(catalogQty);
      if (!Number.isInteger(qty) || qty < 1) {
        newErrors.qty = "Quantity must be at least 1";
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      const catalogExtra = catalogExtras.find((e) => e.id === selectedExtraId);
      if (!catalogExtra) return;
      setErrors({});
      startTransition(async () => {
        await addBookingExtra(bookingId, {
          extra_id: catalogExtra.id,
          name_snapshot: catalogExtra.name,
          price_snapshot: catalogExtra.price,
          currency_snapshot: catalogExtra.currency,
          quantity: qty,
        });
        setSelectedExtraId("");
        setCatalogQty("1");
        setShowAddForm(false);
      });
    } else {
      if (!customName.trim()) newErrors.name = "Name is required";
      const price = Number(customPrice);
      if (isNaN(price) || price < 0) newErrors.price = "Enter a valid price";
      const qty = Number(customQty);
      if (!Number.isInteger(qty) || qty < 1) newErrors.qty = "Quantity must be at least 1";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      startTransition(async () => {
        await addBookingExtra(bookingId, {
          extra_id: null,
          name_snapshot: customName.trim(),
          price_snapshot: price,
          currency_snapshot: customCurrency,
          quantity: qty,
        });
        setCustomName("");
        setCustomPrice("");
        setCustomQty("1");
        setShowAddForm(false);
      });
    }
  }

  function handleRemove(extraId: string) {
    startTransition(async () => {
      await removeBookingExtra(extraId, bookingId);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Extras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extras list */}
        {extras.length > 0 ? (
          <div className="space-y-2">
            {extras.map((extra) => (
              <div
                key={extra.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{extra.name_snapshot}</span>
                  {extra.quantity > 1 && (
                    <span className="text-muted-foreground ml-1">
                      × {extra.quantity}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-medium">
                    {formatCurrency(
                      extra.price_snapshot * extra.quantity,
                      extra.currency_snapshot
                    )}
                  </span>
                  <button
                    onClick={() => handleRemove(extra.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    aria-label="Remove extra"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-1 border-t text-sm font-medium">
              <span>Extras subtotal</span>
              <span className="tabular-nums">
                {formatCurrency(extrasSubtotal, currency)}
              </span>
            </div>
          </div>
        ) : (
          !showAddForm && (
            <p className="text-sm text-muted-foreground">No extras added yet.</p>
          )
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="space-y-3 pt-2 border-t">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("catalog")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  mode === "catalog"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                From catalog
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  mode === "custom"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom
              </button>
            </div>

            {mode === "catalog" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Extra</Label>
                  <Select
                    value={selectedExtraId}
                    onValueChange={setSelectedExtraId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an extra…" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogExtras.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} — {formatCurrency(e.price, e.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.extra && (
                    <p className="text-xs text-destructive">{errors.extra}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={catalogQty}
                    onChange={(e) => setCatalogQty(e.target.value)}
                    className="w-24"
                  />
                  {errors.qty && (
                    <p className="text-xs text-destructive">{errors.qty}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Extra hour"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-1.5">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                    />
                    {errors.qty && (
                      <p className="text-xs text-destructive">{errors.qty}</p>
                    )}
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="0.00"
                    />
                    {errors.price && (
                      <p className="text-xs text-destructive">{errors.price}</p>
                    )}
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Select value={customCurrency} onValueChange={setCustomCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Adding…" : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setErrors({});
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showAddForm && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add extra
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Fused Package + Extras card ─────────────────────────────────────────────

export type BookingWithPackage = Omit<BookingWithVersion, "package_version"> & {
  package_version: NonNullable<BookingWithVersion["package_version"]>;
};

interface PackageExtrasCardProps {
  booking: BookingWithVersion;
  bookingId: string;
  extras: BookingExtra[];
  catalogExtras: Extra[];
  packageTemplates: PackageTemplateWithVersion[];
}

export function PackageExtrasCard({
  booking,
  bookingId,
  extras,
  catalogExtras,
  packageTemplates,
}: PackageExtrasCardProps) {
  const v = booking.package_version;
  const currency = v?.currency ?? "EUR";

  const [mode, setMode] = useState<AddMode>("catalog");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Package picker
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    v?.package_template_id ?? ""
  );

  // Inline pricing edit
  const [editingPricing, setEditingPricing] = useState(false);
  const [draftPriceOverride, setDraftPriceOverride] = useState(
    booking.price_override != null ? String(booking.price_override) : ""
  );
  const [draftHoursOverride, setDraftHoursOverride] = useState(
    booking.hours_override != null ? String(booking.hours_override) : ""
  );

  const [selectedExtraId, setSelectedExtraId] = useState("");
  const [catalogQty, setCatalogQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCurrency, setCustomCurrency] = useState(currency);
  const [customQty, setCustomQty] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const extrasSubtotal = extras.reduce((sum, e) => sum + e.price_snapshot * e.quantity, 0);

  function handleAssignPackage() {
    if (!selectedTemplateId) return;
    startTransition(async () => {
      await updateBookingPackage(bookingId, selectedTemplateId);
      setShowPackagePicker(false);
    });
  }

  function handleSavePricing() {
    startTransition(async () => {
      await updateBookingPricing(bookingId, {
        price_override: draftPriceOverride !== "" ? Number(draftPriceOverride) : null,
        hours_override: draftHoursOverride !== "" ? Number(draftHoursOverride) : null,
      });
      setEditingPricing(false);
    });
  }

  function handleAdd() {
    const newErrors: Record<string, string> = {};
    if (mode === "catalog") {
      if (!selectedExtraId) newErrors.extra = "Select an extra";
      const qty = Number(catalogQty);
      if (!Number.isInteger(qty) || qty < 1) newErrors.qty = "Quantity must be at least 1";
      if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
      const catalogExtra = catalogExtras.find((e) => e.id === selectedExtraId);
      if (!catalogExtra) return;
      setErrors({});
      startTransition(async () => {
        await addBookingExtra(bookingId, {
          extra_id: catalogExtra.id,
          name_snapshot: catalogExtra.name,
          price_snapshot: catalogExtra.price,
          currency_snapshot: catalogExtra.currency,
          quantity: qty,
        });
        setSelectedExtraId(""); setCatalogQty("1"); setShowAddForm(false);
      });
    } else {
      if (!customName.trim()) newErrors.name = "Name is required";
      const price = Number(customPrice);
      if (isNaN(price) || price < 0) newErrors.price = "Enter a valid price";
      const qty = Number(customQty);
      if (!Number.isInteger(qty) || qty < 1) newErrors.qty = "Quantity must be at least 1";
      if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
      setErrors({});
      startTransition(async () => {
        await addBookingExtra(bookingId, {
          extra_id: null,
          name_snapshot: customName.trim(),
          price_snapshot: price,
          currency_snapshot: customCurrency,
          quantity: qty,
        });
        setCustomName(""); setCustomPrice(""); setCustomQty("1"); setShowAddForm(false);
      });
    }
  }

  function handleRemove(extraId: string) {
    startTransition(async () => { await removeBookingExtra(extraId, bookingId); });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Package &amp; Extras
          </CardTitle>
          {v && <Badge variant="outline" className="text-xs">v{v.version_number}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* ── No package assigned ── */}
        {!v && !showPackagePicker && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Package className="h-7 w-7 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No package assigned yet.</p>
            <Button variant="outline" size="sm" onClick={() => setShowPackagePicker(true)}>
              Assign package
            </Button>
          </div>
        )}

        {/* ── Package picker ── */}
        {showPackagePicker && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Select package</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a package…" />
                </SelectTrigger>
                <SelectContent>
                  {packageTemplates.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                      {pt.current_version && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          · {formatCurrency(pt.current_version.base_price, pt.current_version.currency)}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAssignPackage} disabled={isPending || !selectedTemplateId}>
                <Check className="h-3.5 w-3.5" /> Assign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPackagePicker(false)} disabled={isPending}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Package assigned ── */}
        {v && (
          <>
            {/* Package name row — always visible, pencil to change */}
            {!showPackagePicker && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">
                  {packageTemplates.find((pt) => pt.id === v.package_template_id)?.name ?? "Package"}
                </span>
                <button
                  onClick={() => {
                    setSelectedTemplateId(v.package_template_id);
                    setShowPackagePicker(true);
                  }}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
                  aria-label="Change package"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Pricing row */}
            {editingPricing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Price adjustment ({v.currency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draftPriceOverride}
                      onChange={(e) => setDraftPriceOverride(e.target.value)}
                      placeholder="0"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Base: {formatCurrency(v.base_price, v.currency)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hours override</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={draftHoursOverride}
                      onChange={(e) => setDraftHoursOverride(e.target.value)}
                      placeholder={String(v.hours_of_coverage)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: {v.hours_of_coverage}h
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePricing} disabled={isPending}>
                    <Check className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingPricing(false)} disabled={isPending}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {booking.hours_override ?? v.hours_of_coverage}h
                  {(booking.price_override !== null && booking.price_override !== 0) && (
                    <span className="text-xs">
                      · Base {formatCurrency(v.base_price, currency)}{" "}
                      {(booking.price_override ?? 0) > 0 ? "+" : ""}
                      {formatCurrency(booking.price_override ?? 0, currency)}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium">
                    {formatCurrency(booking.total_price, currency)}
                  </span>
                  <button
                    onClick={() => {
                      setDraftPriceOverride(booking.price_override != null ? String(booking.price_override) : "");
                      setDraftHoursOverride(booking.hours_override != null ? String(booking.hours_override) : "");
                      setEditingPricing(true);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit pricing"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Extras */}
            {(extras.length > 0 || showAddForm) && (
              <div className="space-y-2 pt-2 border-t">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{extra.name_snapshot}</span>
                      {extra.quantity > 1 && (
                        <span className="text-muted-foreground ml-1">× {extra.quantity}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-medium">
                        {formatCurrency(extra.price_snapshot * extra.quantity, extra.currency_snapshot)}
                      </span>
                      <button
                        onClick={() => handleRemove(extra.id)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        aria-label="Remove extra"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {extras.length > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t text-xs text-muted-foreground">
                    <span>Extras subtotal</span>
                    <span className="tabular-nums">{formatCurrency(extrasSubtotal, currency)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Grand total */}
            <div className="flex justify-between items-center pt-2 border-t text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(booking.total_price + extrasSubtotal, currency)}</span>
            </div>

            {/* Add extra form */}
            {showAddForm && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex gap-2">
                  {(["catalog", "custom"] as AddMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        mode === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "catalog" ? "From catalog" : "Custom"}
                    </button>
                  ))}
                </div>
                {mode === "catalog" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Extra</Label>
                      <Select value={selectedExtraId} onValueChange={setSelectedExtraId}>
                        <SelectTrigger><SelectValue placeholder="Select an extra…" /></SelectTrigger>
                        <SelectContent>
                          {catalogExtras.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} — {formatCurrency(e.price, e.currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.extra && <p className="text-xs text-destructive">{errors.extra}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" min="1" step="1" value={catalogQty} onChange={(e) => setCatalogQty(e.target.value)} className="w-24" />
                      {errors.qty && <p className="text-xs text-destructive">{errors.qty}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Extra hour" />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min="1" step="1" value={customQty} onChange={(e) => setCustomQty(e.target.value)} />
                        {errors.qty && <p className="text-xs text-destructive">{errors.qty}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Price</Label>
                        <Input type="number" min="0" step="0.01" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="0.00" />
                        {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Currency</Label>
                        <Select value={customCurrency} onValueChange={setCustomCurrency}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={isPending}>{isPending ? "Adding…" : "Add"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setErrors({}); }} disabled={isPending}>Cancel</Button>
                </div>
              </div>
            )}

            {!showAddForm && !editingPricing && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" /> Add extra
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
