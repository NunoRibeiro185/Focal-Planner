"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import {
  toggleBookingService,
  addBookingService,
  removeBookingService,
} from "@/lib/actions/services";
import type { BookingService, Service } from "@/lib/types/database";

interface ServicesPanelProps {
  bookingId: string;
  bookingServices: BookingService[];
  catalogServices: Service[];
  currency: string;
}

export function ServicesPanel({
  bookingId,
  bookingServices,
  catalogServices,
  currency,
}: ServicesPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const trackable = bookingServices.filter((s) => s.track_completion_snapshot);
  const nonTrackable = bookingServices.filter((s) => !s.track_completion_snapshot);

  async function handleAdd() {
    const errors: Record<string, string> = {};
    const service = catalogServices.find((s) => s.id === selectedServiceId);
    if (!service) errors.service = "Select a service";
    const qty = parseInt(addQty, 10);
    if (isNaN(qty) || qty < 1) errors.qty = "Quantity must be at least 1";
    if (Object.keys(errors).length > 0) { setAddErrors(errors); return; }

    await addBookingService(bookingId, {
      service_id: service!.id,
      name_snapshot: service!.name,
      description_snapshot: service!.description ?? null,
      unit_price_snapshot: service!.unit_price,
      quantity: qty,
      track_completion_snapshot: service!.track_completion,
    });
    setSelectedServiceId("");
    setAddQty("1");
    setShowAdd(false);
    setAddErrors({});
  }

  if (bookingServices.length === 0 && !showAdd) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No services added.{" "}
        <button
          type="button"
          className="underline hover:text-foreground"
          onClick={() => setShowAdd(true)}
        >
          Add one
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trackable.length > 0 && (
        <div className="space-y-2">
          {trackable.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              currency={currency}
              bookingId={bookingId}
              showCheckbox
            />
          ))}
        </div>
      )}

      {nonTrackable.length > 0 && (
        <div className="space-y-1">
          {nonTrackable.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              currency={currency}
              bookingId={bookingId}
              showCheckbox={false}
            />
          ))}
        </div>
      )}

      {showAdd ? (
        <div className="rounded border p-3 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Service</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {catalogServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.unit_price, currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addErrors.service && <p className="text-xs text-destructive">{addErrors.service}</p>}
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-xs">Qty</Label>
            <Input
              type="number"
              min="1"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              className="h-8 text-xs"
            />
            {addErrors.qty && <p className="text-xs text-destructive">{addErrors.qty}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd}>Add</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddErrors({}); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3 w-3" /> Add service
        </button>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  currency,
  bookingId,
  showCheckbox,
}: {
  service: BookingService;
  currency: string;
  bookingId: string;
  showCheckbox: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm group">
      {showCheckbox && (
        <Checkbox
          checked={service.done}
          onCheckedChange={(v) => toggleBookingService(service.id, !!v, bookingId)}
        />
      )}
      <span
        className={`flex-1 ${showCheckbox && service.done ? "line-through text-muted-foreground" : ""}`}
      >
        {service.name_snapshot}
        {service.quantity > 1 && (
          <span className="text-muted-foreground ml-1">× {service.quantity}</span>
        )}
      </span>
      <span className="tabular-nums text-xs text-muted-foreground">
        {formatCurrency(service.unit_price_snapshot * service.quantity, currency)}
      </span>
      <button
        type="button"
        onClick={() => removeBookingService(service.id, bookingId)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        aria-label="Remove service"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
