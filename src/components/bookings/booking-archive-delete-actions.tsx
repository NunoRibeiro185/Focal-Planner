"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveX, Trash2 } from "lucide-react";
import { archiveBooking, unarchiveBooking, deleteBooking } from "@/lib/actions/bookings";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
  isArchived: boolean;
  clientName: string;
}

export function BookingArchiveDeleteActions({ bookingId, isArchived, clientName }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPendingArchive, startArchiveTransition] = useTransition();
  const [isPendingDelete, startDeleteTransition] = useTransition();

  const handleArchiveToggle = () => {
    startArchiveTransition(async () => {
      if (isArchived) {
        await unarchiveBooking(bookingId);
      } else {
        await archiveBooking(bookingId);
      }
    });
  };

  const handleDeleteConfirm = () => {
    startDeleteTransition(async () => {
      await deleteBooking(bookingId);
    });
  };

  return (
    <div className="flex flex-col items-end gap-3 shrink-0">
      {/* Icon buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleArchiveToggle}
          disabled={isPendingArchive}
          title={isArchived ? "Unarchive booking" : "Archive booking"}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
        >
          {isArchived
            ? <ArchiveX className="h-[18px] w-[18px]" strokeWidth={1.5} />
            : <Archive className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        </button>

        <button
          onClick={() => setShowDeleteConfirm((v) => !v)}
          title="Delete booking"
          aria-expanded={showDeleteConfirm}
          className={cn(
            "p-2 rounded-md transition-colors",
            showDeleteConfirm
              ? "text-destructive bg-destructive/10"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/8"
          )}
        >
          <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Inline delete confirmation */}
      {showDeleteConfirm && (
        <div className="text-right animate-in fade-in-0 slide-in-from-top-2 duration-200 ease-out">
          <p className="text-xs text-muted-foreground mb-2.5 max-w-[200px] leading-relaxed">
            Permanently delete{" "}
            <span className="font-medium text-foreground">{clientName}</span>
            ’s booking and all its data. This cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isPendingDelete}
              className="text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors"
            >
              {isPendingDelete ? "Deleting…" : "Delete booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
