"use client";

import { useState, useEffect, useTransition } from "react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
  STATUS_STEPS,
} from "@/lib/utils/booking-status";
import { updateBookingStatus, updateBookingQuick } from "@/lib/actions/bookings";
import type { CalendarEvent, BookingStatus } from "@/lib/types";

// All statuses except "done" and "cancelled" — those aren't quick-selectable
const QUICK_STATUSES = STATUS_STEPS.filter((s) => s !== "done") as BookingStatus[];

interface BookingPreviewPopoverProps {
  event: Extract<CalendarEvent, { kind: "booking" }>;
  onSaved?: () => void;
  onWillClose?: () => void;
  hasConflict?: boolean;
  children: React.ReactNode;
}

export function BookingPreviewPopover({
  event,
  onSaved,
  onWillClose,
  hasConflict,
  children,
}: BookingPreviewPopoverProps) {
  const [status, setStatus] = useState<BookingStatus>(event.status);
  const [date, setDate] = useState(event.start);
  const [startTime, setStartTime] = useState(event.startTime ?? "");
  const [isPending, startTransition] = useTransition();

  // Sync local state when the event prop changes (e.g. after a save refreshes the cache)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop→state resync after the event prop changes
    setStatus(event.status);
    setDate(event.start);
    setStartTime(event.startTime ?? "");
  }, [event.status, event.start, event.startTime]);

  const statusChanged = status !== event.status;
  const datetimeChanged =
    date !== event.start || (startTime || null) !== event.startTime;
  const hasChanges = statusChanged || datetimeChanged;

  function handleSave() {
    startTransition(async () => {
      const tasks: Promise<void>[] = [];
      if (statusChanged) {
        tasks.push(updateBookingStatus(event.bookingId, status));
      }
      if (datetimeChanged) {
        tasks.push(
          updateBookingQuick(event.bookingId, {
            event_date: date,
            start_time: startTime || null,
          })
        );
      }
      await Promise.all(tasks);
      onSaved?.();
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-4 space-y-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={() => onWillClose?.()}
      >
        {/* Client name */}
        <p className="font-semibold text-sm leading-tight">{event.clientName}</p>

        {/* Conflict warning */}
        {hasConflict && (
          <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 border border-yellow-200 px-2 py-1.5 text-yellow-800 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Inquiry conflicts with a confirmed booking on this date
          </div>
        )}

        {/* Status / color */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                title={BOOKING_STATUS_LABELS[s]}
                onClick={() => setStatus(s)}
                className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: BOOKING_STATUS_COLORS[s],
                  borderColor: status === s ? "black" : "transparent",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{BOOKING_STATUS_LABELS[status]}</p>
        </div>

        {/* Date + time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-7 text-xs px-2"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-7 text-xs px-2"
            />
          </div>
        </div>

        {/* Read-only info */}
        {event.venueName && (
          <p className="text-xs text-muted-foreground">📍 {event.venueName}</p>
        )}
        {event.hoursOfCoverage && (
          <p className="text-xs text-muted-foreground">⏱ {event.hoursOfCoverage}h coverage</p>
        )}
        <p className="text-xs font-medium">
          {event.currency} {event.totalPrice.toFixed(2)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <PrefetchLink
            href={`/bookings/${event.bookingId}`}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            View full booking
            <ExternalLink className="h-3 w-3" />
          </PrefetchLink>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-7 text-xs"
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
