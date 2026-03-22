"use client";

import { useTransition } from "react";
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
      await toggleBookingDeliverable(progressId, done, bookingId);
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
            className="flex items-center gap-3 cursor-pointer"
          >
            <Checkbox
              checked={d.done}
              disabled={isPending}
              onCheckedChange={(checked) => handleToggle(d.id, !!checked)}
            />
            <span className={`text-sm ${d.done ? "line-through text-muted-foreground" : ""}`}>
              {d.label}
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
