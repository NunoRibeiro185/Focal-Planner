"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleBookingDeliverable } from "@/lib/actions/bookings";
import type { BookingDeliverableProgress } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface DeliverablesPanelProps {
  deliverableProgress: BookingDeliverableProgress[];
  bookingId: string;
}

export function DeliverablesPanel({
  deliverableProgress,
  bookingId,
}: DeliverablesPanelProps) {
  const [isPending, startTransition] = useTransition();

  if (deliverableProgress.length === 0) {
    return null;
  }

  function handleToggle(progressId: string, done: boolean) {
    startTransition(async () => {
      try {
        await toggleBookingDeliverable(progressId, done, bookingId);
      } catch {
        toast.error("Couldn't update deliverable — try again");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Deliverables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deliverableProgress.map((d) => (
          <label
            key={d.id}
            className="flex items-start gap-3 cursor-pointer"
          >
            <Checkbox
              checked={d.done}
              disabled={isPending}
              onCheckedChange={(checked) => handleToggle(d.id, !!checked)}
              className="mt-0.5"
            />
            <div>
              <span className={`text-sm ${d.done ? "line-through text-muted-foreground" : ""}`}>
                {d.label}
              </span>
              {d.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {d.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
