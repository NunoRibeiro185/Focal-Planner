"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  bookingFormSchema,
  LEAD_SOURCE_OPTIONS,
  type BookingFormValues,
  type ItineraryStopInput,
} from "@/lib/types/forms";
import { formatCurrency } from "@/lib/utils/currency";
import { PackageBuilder } from "@/components/bookings/package-builder";
import { computeFinalPrice, computeSubtotal, type BuilderLineItem } from "@/lib/utils/booking-builder";
import type { PackageTemplateWithServices } from "@/lib/types/services";
import type { Service } from "@/lib/types/services";
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
  services: Service[];
  packages: PackageTemplateWithServices[];
  onSubmit: (
    values: BookingFormValues,
    services: BuilderLineItem[],
    itinerary: ItineraryStopInput[],
    depositAlreadyPaid: boolean,
    addAnother: boolean
  ) => Promise<void>;
  defaultCurrency?: string;
  hideBuilder?: boolean;
  mode?: "booking" | "inquiry";
}

type DepositMode = "amount" | "percent";

const EMPTY_STOP: ItineraryStopInput = { name: "", address: "", start_time: "", notes: "" };

export function BookingForm({ mode = "booking", ...props }: BookingFormProps) {
  const isInquiry = mode === "inquiry";
  const [pending, setPending] = useState(false);

  // Itinerary state
  const [itinerary, setItinerary] = useState<ItineraryStopInput[]>([{ ...EMPTY_STOP }]);
  const [itineraryError, setItineraryError] = useState("");
  const [showItinerary, setShowItinerary] = useState(false);

  // Builder state
  const [builderItems, setBuilderItems] = useState<BuilderLineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [depositAlreadyPaid, setDepositAlreadyPaid] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const subtotal = computeSubtotal(builderItems);
  const grandTotal = computeFinalPrice(subtotal, discount);

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
      client_name_primary: "",
      client_name_secondary: null,
      client_email: null,
      client_phone: null,
      lead_source: null,
      event_date: "",
      location: null,
      notes: null,
      discount_amount: 0,
      deposit_amount: null,
      payment_due_date: null,
    },
  });

  const currency = props.defaultCurrency ?? "EUR";

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

  // ── Form submit ──────────────────────────────────────────────

  async function onSubmit(values: BookingFormValues) {
    const namedStops = itinerary.filter((s) => s.name.trim());
    if (!isInquiry) {
      if (namedStops.length === 0) {
        setItineraryError("Add at least one location");
        return;
      }
    }
    setItineraryError("");
    setPending(true);
    try {
      const stopsToSubmit = isInquiry && !showItinerary ? [] : namedStops;
      await props.onSubmit(values, builderItems, stopsToSubmit, depositAlreadyPaid, addAnother);
    } catch {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
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

      {/* ── Date & Location (inquiry: top-level; booking: inside itinerary) ── */}
      {isInquiry ? (
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="event_date">Date</Label>
            <Input id="event_date" type="date" {...register("event_date")} />
            {errors.event_date && (
              <p className="text-sm text-destructive">{errors.event_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. Porto, Portugal" {...register("location")} />
          </div>
        </div>
      ) : (
        <>
          {/* ── Itinerary ─────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Itinerary</p>
          </div>

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
              <Input id="location" placeholder="e.g. Porto, Portugal" {...register("location")} />
            </div>
          </div>
        </>
      )}

      {/* ── Itinerary stops ── */}
      {isInquiry ? (
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowItinerary((v) => !v)}
          >
            <MapPin className="h-4 w-4 mr-1" />
            {showItinerary ? "Remove itinerary" : "Add itinerary"}
          </Button>

          {showItinerary && (
            <div className="space-y-4">
              {itinerary.map((stop, index) => (
                <div key={index} className="rounded-md border p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {itinerary.length > 1 ? `Stop ${index + 1}` : "Stop"}
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
                      <Label className="text-xs">Location name</Label>
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
              <Button type="button" variant="outline" size="sm" onClick={addStop}>
                <Plus className="h-4 w-4 mr-1" />
                Add stop
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {itinerary.map((stop, index) => (
            <div key={index} className="rounded-md border p-4 space-y-3 relative">
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
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">General notes</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <Separator />

      {/* ── Package Builder ─────────────────────────────────────── */}
      {!props.hideBuilder && (
        <>
          <p className="text-sm font-medium">Package</p>
          <PackageBuilder
            services={props.services}
            packages={props.packages}
            items={builderItems}
            discount={discount}
            currency={props.defaultCurrency ?? "EUR"}
            onItemsChange={setBuilderItems}
            onDiscountChange={setDiscount}
          />
          <Separator />
        </>
      )}

      {/* ── Payment ─────────────────────────────────────────── */}
      <p className="text-sm font-medium">Payment</p>

      {builderItems.length > 0 && (
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
                <p className="text-xs text-muted-foreground">Add services first</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment_due_date">Balance due date</Label>
          <Input id="payment_due_date" type="date" {...register("payment_due_date")} />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        {!isInquiry && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deposit_already_paid"
              checked={depositAlreadyPaid}
              onChange={(e) => setDepositAlreadyPaid(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="deposit_already_paid" className="text-sm cursor-pointer">
              Deposit already paid
            </Label>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="add_another"
            checked={addAnother}
            onChange={(e) => setAddAnother(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="add_another" className="text-sm cursor-pointer">
            {isInquiry ? "Add another inquiry after saving" : "Add another booking after saving"}
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : isInquiry ? "Create Inquiry" : "Create Booking"}
      </Button>
    </form>
  );
}
