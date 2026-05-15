"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { packageFormSchema, type PackageFormValues } from "@/lib/types/forms";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { formatCurrency } from "@/lib/utils/currency";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import type { Service } from "@/lib/types/database";

export interface PackageServiceItem {
  service_id: string;
  default_quantity: number;
}

interface PackageFormProps {
  defaultValues?: Partial<PackageFormValues>;
  defaultServices?: PackageServiceItem[];
  services?: Service[];
  onSubmit: (values: PackageFormValues, serviceItems: PackageServiceItem[]) => Promise<void>;
  submitLabel?: string;
}

export function PackageForm({
  defaultValues,
  defaultServices = [],
  services = [],
  onSubmit,
  submitLabel = "Save Package",
}: PackageFormProps) {
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serviceItems, setServiceItems] = useState<PackageServiceItem[]>(defaultServices);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addError, setAddError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackageFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(packageFormSchema) as any,
    defaultValues: {
      name: "",
      description: null,
      base_price: 0,
      currency: "EUR",
      hours_of_coverage: 8,
      ...defaultValues,
    },
  });

  const currency = watch("currency");

  const availableServices = services.filter(
    (s) => !serviceItems.some((item) => item.service_id === s.id)
  );

  function handleAddService() {
    if (!selectedServiceId) { setAddError("Select a service"); return; }
    const qty = parseInt(addQty, 10);
    if (isNaN(qty) || qty < 1) { setAddError("Quantity must be at least 1"); return; }
    setServiceItems((prev) => [...prev, { service_id: selectedServiceId, default_quantity: qty }]);
    setSelectedServiceId("");
    setAddQty("1");
    setAddError("");
    setShowAddService(false);
  }

  function updateQty(serviceId: string, qty: number) {
    setServiceItems((prev) =>
      prev.map((item) => item.service_id === serviceId ? { ...item, default_quantity: Math.max(1, qty) } : item)
    );
  }

  function removeService(serviceId: string) {
    setServiceItems((prev) => prev.filter((item) => item.service_id !== serviceId));
  }

  async function handleFormSubmit(values: PackageFormValues) {
    setPending(true);
    setSubmitError(null);
    try {
      await onSubmit(values, serviceItems);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-lg">

      <div className="space-y-1.5">
        <Label htmlFor="name">Package name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g. Gold Package"
          autoFocus={!defaultValues?.name}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="A relaxed afternoon from first look through golden hour portraits…"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Appears on client proposals — write it like you&apos;d introduce the package to a couple.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="base_price">Base price</Label>
          <Input
            id="base_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="e.g. 1500"
            {...register("base_price")}
          />
          {errors.base_price && (
            <p className="text-sm text-destructive">{errors.base_price.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setValue("currency", v)}
          >
            <SelectTrigger id="currency">
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

      <div className="space-y-1.5">
        <Label htmlFor="hours_of_coverage">Hours of coverage</Label>
        <Input
          id="hours_of_coverage"
          type="number"
          step="0.5"
          min="0.5"
          max="24"
          placeholder="e.g. 8"
          {...register("hours_of_coverage")}
        />
        {errors.hours_of_coverage && (
          <p className="text-sm text-destructive">{errors.hours_of_coverage.message}</p>
        )}
      </div>

      {services.length > 0 && (
        <>
          <Separator />

          <div className="space-y-3">
            <Label>Services included</Label>

            {serviceItems.length > 0 && (
              <div className="space-y-2">
                {serviceItems.map((item) => {
                  const svc = services.find((s) => s.id === item.service_id);
                  if (!svc) return null;
                  return (
                    <div key={item.service_id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 min-w-0 truncate">{svc.name}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(svc.unit_price, currency)}</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.default_quantity}
                        onChange={(e) => updateQty(item.service_id, parseInt(e.target.value) || 1)}
                        className="w-16 h-7 text-xs text-center"
                        aria-label="Default quantity"
                      />
                      <button
                        type="button"
                        onClick={() => removeService(item.service_id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {showAddService ? (
              <div className="rounded-md border p-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Service</Label>
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select a service…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {formatCurrency(s.unit_price, currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-24">
                  <Label className="text-xs">Default qty</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddService}>Add</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddService(false); setAddError(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              availableServices.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddService(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add service
                </Button>
              )
            )}
          </div>
        </>
      )}

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <a
          href="/packages"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </a>
        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}
      </div>
    </form>
  );
}
