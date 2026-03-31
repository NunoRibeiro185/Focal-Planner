"use client";

import { useState, useTransition } from "react";
import { STATUS_STEPS, BOOKING_STATUS_LABELS, getStepperTargetStatus, isTerminalStatus, isBackwardTransition } from "@/lib/utils/booking-status";
import { updateBookingStatus } from "@/lib/actions/bookings";
import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StatusStepperProps {
  bookingId: string;
  currentStatus: BookingStatus;
}

export function StatusStepper({ bookingId, currentStatus }: StatusStepperProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
  const [pendingTarget, setPendingTarget] = useState<BookingStatus | null>(null);

  const activeStatus = optimisticStatus;
  const currentIndex = STATUS_STEPS.indexOf(activeStatus);
  const isLocked = isTerminalStatus(activeStatus);

  // Determines if rolling back from editing (or beyond) so we warn about progress loss
  function isEditingRollback(from: BookingStatus, to: BookingStatus): boolean {
    if (!isBackwardTransition(from, to)) return false;
    const editingIdx = STATUS_STEPS.indexOf("editing");
    const fromIdx = STATUS_STEPS.indexOf(from);
    return fromIdx >= editingIdx;
  }

  function handleStepClick(index: number) {
    const target = getStepperTargetStatus(activeStatus, index);
    if (!target) return;

    if (isEditingRollback(activeStatus, target)) {
      setPendingTarget(target);
      return;
    }

    applyTransition(target);
  }

  function applyTransition(target: BookingStatus) {
    setOptimisticStatus(target);
    setPendingTarget(null);
    startTransition(async () => {
      await updateBookingStatus(bookingId, target);
    });
  }

  return (
    <>
      {/* Backward transition warning for editing progress */}
      <Dialog
        open={pendingTarget !== null}
        onOpenChange={(open) => { if (!open) setPendingTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset editing progress?</DialogTitle>
            <DialogDescription>
              Rolling back from <strong>Editing</strong> will permanently delete
              all editing stage progress for this booking. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingTarget && applyTransition(pendingTarget)}
            >
              Yes, reset progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div>
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable =
            !isLocked && getStepperTargetStatus(activeStatus, index) !== null;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <button
                onClick={() => handleStepClick(index)}
                disabled={!isClickable || isPending}
                className={cn(
                  "flex flex-col items-center gap-1.5 group",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-muted-foreground/30 text-muted-foreground",
                    isClickable && isCompleted &&
                      "group-hover:bg-primary/80 group-hover:border-primary/80",
                    isClickable && !isCompleted &&
                      "group-hover:border-primary group-hover:text-primary"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* Labels: hidden on mobile, visible on sm+ */}
                <span
                  className={cn(
                    "hidden sm:block text-xs whitespace-nowrap",
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {BOOKING_STATUS_LABELS[step]}
                </span>
              </button>

              {/* Connector line */}
              {index < STATUS_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    "sm:mb-5",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label — mobile only */}
      <p className="sm:hidden mt-2 text-sm font-medium text-center">
        {BOOKING_STATUS_LABELS[activeStatus]}
        <span className="text-muted-foreground font-normal">
          {" "}· step {currentIndex + 1} of {STATUS_STEPS.length}
        </span>
      </p>
    </div>
    </>
  );
}
