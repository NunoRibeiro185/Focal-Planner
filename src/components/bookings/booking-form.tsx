"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  bookingFormSchema,
  LEAD_SOURCE_OPTIONS,
  type BookingFormValues,
  type BookingExtraValues,
  type ItineraryStopInput,
} from "@/lib/types/forms";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import type { Extra, PackageTemplateWithVersion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, MapPin } from "lucide-react";

interface BookingFormProps {
  packages: PackageTemplateWithVersion[];
  onSubmit: (
    values: BookingFormValues,
    extras: BookingExtraValues[],
    itinerary: ItineraryStopInput[]
  ) => Promise<void>;
  defaultValues?: Partial<BookingFormValues>;
  submitLabel?: string;
  catalogExtras?: Extra[];
  initialItinerary?: ItineraryStopInput[];
}

type AddMode = "catalog" | "custom";
type DepositMode = "amount" | "percent";

const EMPTY_STOP: ItineraryStopInput = { name: "", address: "", start_time: "", notes: "" };

export function BookingForm({
  packages,
  onSubmit,
  defaultValues,
  submitLabel = "Create Booking",
  catalogExtras = [],
  initialItinerary,
}: BookingFormProps) {
  const [pending, setPending] = useState(false);

  // Itinerary state
  const [itinerary, setItinerary] = useState<ItineraryStopInput[]>(
    initialItinerary && initialItinerary.length > 0
      ? initialItinerary
      : [{ ...EMPTY_STOP }]
  );
  const [itineraryError, setItineraryError] = useState("");

  // Extras local state
  const [pendingExtras, setPendingExtras] = useState<BookingExtraValues[]>([]);
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("catalog");
  const [selectedExtraId, setSelectedExtraId] = useState("");
  const [catalogQty, setCatalogQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCurrency, setCustomCurrency] = useState("EUR");
  const [customQty, setCustomQty] = useState("1");
  const [extraErrors, setExtraErrors] = useState<Record<string, string>>({});

  // Deposit mode state
  const [depositMode, setDepositMode] = useState<DepositMode>("amount");
  const [depositPercent, setDepositPercent] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bookingFormSchema) as any,
    defaultValues: {
      package_template_id: "",
      client_name_primary: "",
      client_name_secondary: null,
      client_email: null,
      client_phone: null,
      lead_source: null,
      event_date: "",
      location: null,
      notes: null,
      price_override: null,
      hours_override: null,
      deposit_amount: null,
      payment_due_date: null,
      ...defaultValues,
    },
  });

  const selectedPackageId = watch("package_template_id");
  const priceOverride = watch("price_override");

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const version = selectedPackage?.current_version;

  const basePrice = version?.base_price ?? 0;
  const packageTotal = basePrice + (priceOverride ?? 0);
  const currency = version?.currency ?? "EUR";

  const extrasSubtotal = pendingExtras.reduce(
    (sum, e) => sum + e.price_snapshot * e.quantity,
    0
  );
  const grandTotal = packageTotal + extrasSubtotal;

  // ── Itinerary helpers ────────────────────────────────────────

  function updateStop(index: number, field: keyof ItineraryStopInput, value: string) {
    setItinerary((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addStop() {
    setItinerary((prev) => [...prev, { ...EMPTY_STOP }]);
  }

  function removeStop(index: number) {
    setItinerary((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Deposit helpers ──────────────────────────────────────────

  function handleDepositPercentChange(raw: string) {
    setDepositPercent(raw);
    const pct = parseFloat(raw);
    if (!isNaN(pct) && pct >= 0 && pct <= 100 && grandTotal > 0) {
      setValue("deposit_amount", Math.round((pct / 100) * grandTotal * 100) / 100);
    } else {
      setValue("deposit_amount", null);
    }
  }

  const depositAmountValue = watch("deposit_amount");
  if (depositMode === "percent" && depositPercent) {
    const pct = parseFloat(depositPercent);
    if (!isNaN(pct) && grandTotal > 0) {
      const computed = Math.round((pct / 100) * grandTotal * 100) / 100;
      if (computed !== depositAmountValue) setValue("deposit_amount", computed);
    }
  }

  // ── Extras helpers ───────────────────────────────────────────

  function handleAddExtra() {
    const errs: Record<string, string> = {};
    if (addMode === "catalog") {
      if (!selectedExtraId) errs.extra = "Select an extra";
      const qty = Number(catalogQty);
      if (!Number.isInteger(qty) || qty < 1) errs.qty = "Quantity must be at least 1";
      if (Object.keys(errs).length) { setExtraErrors(errs); return; }
      const cat = catalogExtras.find((e) => e.id === selectedExtraId)!;
      setPendingExtras((prev) => [
        ...prev,
        { extra_id: cat.id, name_snapshot: cat.name, price_snapshot: cat.price, currency_snapshot: cat.currency, quantity: qty },
      ]);
      setSelectedExtraId("");
      setCatalogQty("1");
    } else {
      if (!customName.trim()) errs.name = "Name is required";
      const price = Number(customPrice);
      if (isNaN(price) || price < 0) errs.price = "Enter a valid price";
      const qty = Number(customQty);
      if (!Number.isInteger(qty) || qty < 1) errs.qty = "Quantity must be at least 1";
      if (Object.keys(errs).length) { setExtraErrors(errs); return; }
      setPendingExtras((prev) => [
        ...prev,
        { extra_id: null, name_snapshot: customName.trim(), price_snapshot: price, currency_snapshot: customCurrency, quantity: qty },
      ]);
      setCustomName("");
      setCustomPrice("");
      setCustomQty("1");
    }
    setExtraErrors({});
    setShowAddExtra(false);
  }

  // ── Form submit ──────────────────────────────────────────────

  async function handleFormSubmit(values: BookingFormValues) {
    // Validate at least one named stop
    const namedStops = itinerary.filter((s) => s.name.trim());
    if (namedStops.length === 0) {
      setItineraryError("Add at least one location");
      return;
    }
    setItineraryError("");
    setPending(true);
    try {
      await onSubmit(values, pendingExtras, namedStops);
    } catch {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-2xl">
      {/* ── Client ─────────────────────────────────────────── */}
      <p className="text-sm font-medium">Client</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="client_name_primary">Client 1 Name *</Label>
          <Input id="client_name_primary" {...register("client_name_primary")} />
          {errors.client_name_primary && (
            <p className="text-sm text-destructive">{errors.client_name_primary.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_name_secondary">Client 2 Name</Label>
          <Input id="client_name_secondary" {...register("client_name_secondary")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_email">Email</Label>
          <Input id="client_email" type="email" {...register("client_email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_phone">Phone</Label>
          <Input id="client_phone" type="tel" {...register("client_phone")} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="lead_source">How did they find you?</Label>
          <Select
            value={watch("lead_source") ?? ""}
            onValueChange={(v) =>
              setValue(
                "lead_source",
                v === "" ? null : (v as BookingFormValues["lead_source"])
              )
            }
          >
            <SelectTrigger id="lead_source">
              <SelectValue placeholder="Select source (optional)" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* ── Itinerary ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Itinerary</p>
      </div>

      {/* Event date + location */}
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="event_date">Event date *</Label>
          <Input id="event_date" type="date" {...register("event_date")} />
          {errors.event_date && (
            <p className="text-sm text-destructive">{errors.event_date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g. Porto, Portugal"
            {...register("location")}
          />
        </div>
      </div>

      {/* Stops */}
      <div className="space-y-4">
        {itinerary.map((stop, index) => (
          <div key={index} className="rounded-md border p-4 space-y-3 relative">
            {/* Stop header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {itinerary.length > 1 ? `Stop ${index + 1}` : "Location"}
              </div>
              {itinerary.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove stop"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Location name *</Label>
                <Input
                  placeholder="e.g. Church, Reception venue…"
                  value={stop.name}
                  onChange={(e) => updateStop(index, "name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Address</Label>
                <Input
                  placeholder="Street address or Google Maps link"
                  value={stop.address}
                  onChange={(e) => updateStop(index, "address", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Input
                  type="time"
                  value={stop.start_time}
                  onChange={(e) => updateStop(index, "start_time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="e.g. Use side entrance"
                  value={stop.notes}
                  onChange={(e) => updateStop(index, "notes", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        {itineraryError && (
          <p className="text-sm text-destructive">{itineraryError}</p>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addStop}>
          <Plus className="h-4 w-4 mr-1" />
          Add stop
        </Button>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">General notes</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <Separator />

      {/* ── Package ─────────────────────────────────────────── */}
      <p className="text-sm font-medium">Package</p>
      <div className="space-y-1.5">
        <Select
          value={selectedPackageId}
          onValueChange={(v) => setValue("package_template_id", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a package…" />
          </SelectTrigger>
          <SelectContent>
            {packages.map((pkg) => (
              <SelectItem key={pkg.id} value={pkg.id}>
                {pkg.name}
                {pkg.current_version && (
                  <span className="text-muted-foreground ml-2">
                    — {formatCurrency(pkg.current_version.base_price, pkg.current_version.currency)}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.package_template_id && (
          <p className="text-sm text-destructive">{errors.package_template_id.message}</p>
        )}
      </div>

      {version && (
        <>
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-muted-foreground mb-2">Snapshot at booking</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Base price:</span>
              <span className="font-medium text-foreground">{formatCurrency(basePrice, currency)}</span>
              <span>Hours:</span>
              <span className="font-medium text-foreground">{version.hours_of_coverage}h</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price_override">Price adjustment ({currency})</Label>
              <Input
                id="price_override"
                type="number"
                step="0.01"
                placeholder="e.g. +200 or -100"
                {...register("price_override")}
              />
              {packageTotal !== basePrice && (
                <p className="text-xs text-muted-foreground">
                  Package total: <strong>{formatCurrency(packageTotal, currency)}</strong>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours_override">Hours adjustment</Label>
              <Input
                id="hours_override"
                type="number"
                step="0.5"
                placeholder="e.g. +1 or -0.5"
                {...register("hours_override")}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Extras ──────────────────────────────────────────── */}
      <p className="text-sm font-medium">Extras</p>
      <div className="space-y-3">
        {pendingExtras.length > 0 && (
          <div className="space-y-2">
            {pendingExtras.map((extra, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{extra.name_snapshot}</span>
                  {extra.quantity > 1 && (
                    <span className="text-muted-foreground ml-1">× {extra.quantity}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {formatCurrency(extra.price_snapshot * extra.quantity, extra.currency_snapshot)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingExtras((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove extra"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {extrasSubtotal > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>Extras subtotal</span>
                <span className="tabular-nums">{formatCurrency(extrasSubtotal, currency)}</span>
              </div>
            )}
          </div>
        )}

        {showAddExtra ? (
          <div className="space-y-3 rounded-md border p-4">
            {catalogExtras.length > 0 && (
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

            {addMode === "catalog" && catalogExtras.length > 0 ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Extra</Label>
                  <Select value={selectedExtraId} onValueChange={setSelectedExtraId}>
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
                  {extraErrors.extra && <p className="text-xs text-destructive">{extraErrors.extra}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min="1" step="1" value={catalogQty} onChange={(e) => setCatalogQty(e.target.value)} className="w-24" />
                  {extraErrors.qty && <p className="text-xs text-destructive">{extraErrors.qty}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Extra hour" />
                  {extraErrors.name && <p className="text-xs text-destructive">{extraErrors.name}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="1" step="1" value={customQty} onChange={(e) => setCustomQty(e.target.value)} />
                    {extraErrors.qty && <p className="text-xs text-destructive">{extraErrors.qty}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" min="0" step="0.01" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="0.00" />
                    {extraErrors.price && <p className="text-xs text-destructive">{extraErrors.price}</p>}
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
              <Button type="button" size="sm" onClick={handleAddExtra}>Add</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddExtra(false); setExtraErrors({}); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddExtra(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add extra
          </Button>
        )}
      </div>

      <Separator />

      {/* ── Payment ─────────────────────────────────────────── */}
      <p className="text-sm font-medium">Payment</p>

      {version && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">Grand total</span>
          <span className="font-semibold tabular-nums">{formatCurrency(grandTotal, currency)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="deposit_amount">Deposit</Label>
            <div className="flex gap-1 text-xs">
              {(["amount", "percent"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setDepositMode(m); setDepositPercent(""); setValue("deposit_amount", null); }}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    depositMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "amount" ? currency : "%"}
                </button>
              ))}
            </div>
          </div>

          {depositMode === "amount" ? (
            <Input id="deposit_amount" type="number" step="0.01" min="0" {...register("deposit_amount")} />
          ) : (
            <div className="space-y-1">
              <div className="relative">
                <Input
                  id="deposit_amount"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="e.g. 30"
                  value={depositPercent}
                  onChange={(e) => handleDepositPercentChange(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              {depositPercent && grandTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  = <strong>{formatCurrency(watch("deposit_amount") ?? 0, currency)}</strong>
                </p>
              )}
              {depositPercent && grandTotal === 0 && (
                <p className="text-xs text-muted-foreground">Select a package first</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment_due_date">Balance due date</Label>
          <Input id="payment_due_date" type="date" {...register("payment_due_date")} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
