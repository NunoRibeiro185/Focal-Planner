"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/booking-section";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { computeSubtotal, computeFinalPrice, type BuilderLineItem } from "@/lib/utils/booking-builder";
import { PackageBuilder } from "@/components/bookings/package-builder";
import { updateBookingServices } from "@/lib/actions/bookings";
import { sendProposal } from "@/lib/actions/deal-room";
import type { BookingWithVersion } from "@/lib/types/database";
import type { BookingService, Service, PackageTemplateWithServices } from "@/lib/types/services";
import type { DealRoomProposal } from "@/lib/types/deal-room";

interface PackageExtrasCardProps {
  booking: BookingWithVersion;
  bookingId: string;
  bookingServices: BookingService[];
  catalogServices: Service[];
  packages: PackageTemplateWithServices[];
  currency: string;
  proposal?: DealRoomProposal | null;
  // Legacy props kept for compat — unused
  extras?: unknown[];
  catalogExtras?: never[];
  packageTemplates?: unknown[];
}

function toBuilderItems(services: BookingService[]): BuilderLineItem[] {
  return [...services]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      service_id: s.service_id,
      name_snapshot: s.name_snapshot,
      description_snapshot: s.description_snapshot,
      unit_price_snapshot: s.unit_price_snapshot,
      quantity: s.quantity,
      track_completion_snapshot: s.track_completion_snapshot,
    }));
}

export function PackageExtrasCard({
  booking,
  bookingId,
  bookingServices,
  catalogServices,
  packages,
  currency,
  proposal,
}: PackageExtrasCardProps) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<BuilderLineItem[]>(() => toBuilderItems(bookingServices));
  const [discount, setDiscount] = useState(booking.discount_amount ?? 0);
  const [isPending, startTransition] = useTransition();
  const [allowRenegotiation, setAllowRenegotiation] = useState(false);
  const [isSendingProposal, startSendProposal] = useTransition();

  const showProposalButton =
    booking.status === "inquiry" && proposal?.status !== "accepted";

  function handleSendProposal() {
    const pv = booking.package_version;
    const lineItems = [
      { name: pv?.version_name ?? "Base package", price: pv?.base_price ?? 0, is_base: true as const },
      ...bookingServices.map((s) => ({
        name: s.name_snapshot,
        price: s.unit_price_snapshot * s.quantity,
        is_base: false as const,
      })),
    ].filter((i) => i.name.trim());

    if (lineItems.length === 0) {
      toast.error("Add at least one service before sending a proposal.");
      return;
    }

    startSendProposal(async () => {
      try {
        await sendProposal({
          bookingId,
          packageName: pv?.version_name ?? "Package",
          lineItems,
          allowRenegotiation,
        });
        toast.success("Proposal sent to client.");
      } catch {
        toast.error("Couldn't send proposal — try again.");
      }
    });
  }

  const subtotal = computeSubtotal(items);
  const total = computeFinalPrice(subtotal, discount);

  function handleEdit() {
    setItems(toBuilderItems(bookingServices));
    setDiscount(booking.discount_amount ?? 0);
    setEditing(true);
  }

  function handleCancel() {
    setItems(toBuilderItems(bookingServices));
    setDiscount(booking.discount_amount ?? 0);
    setEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateBookingServices(bookingId, items, discount);
        setEditing(false);
      } catch {
        toast.error("Couldn't save — try again");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Package &amp; Services
          </CardTitle>
          {!editing && (
            <button
              onClick={handleEdit}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit services"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <PackageBuilder
              services={catalogServices}
              packages={packages}
              items={items}
              discount={discount}
              currency={currency}
              onItemsChange={setItems}
              onDiscountChange={setDiscount}
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </>
        ) : bookingServices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">No services added yet.</p>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Build package
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...bookingServices]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="flex-1 min-w-0 font-medium truncate">
                    {s.name_snapshot}
                    {s.quantity > 1 && (
                      <span className="text-muted-foreground font-normal ml-1">× {s.quantity}</span>
                    )}
                  </span>
                  <span className="tabular-nums text-sm ml-3">
                    {formatCurrency(s.unit_price_snapshot * s.quantity, currency)}
                  </span>
                </div>
              ))}

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatCurrency(discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        )}

        {!editing && showProposalButton && (
          <div className="border-t pt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowRenegotiation}
                onChange={(e) => setAllowRenegotiation(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Allow client to counter-offer
            </label>
            <Button
              size="sm"
              onClick={handleSendProposal}
              disabled={isSendingProposal}
            >
              {isSendingProposal
                ? "Sending…"
                : proposal
                ? "Send revised proposal"
                : "Send proposal"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
