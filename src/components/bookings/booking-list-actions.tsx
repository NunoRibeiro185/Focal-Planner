"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { archiveBooking, deleteBooking } from "@/lib/actions/bookings";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
  clientName: string;
}

export function BookingListActions({ bookingId, clientName }: Props) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPendingArchive, startArchiveTransition] = useTransition();
  const [isPendingDelete, startDeleteTransition] = useTransition();

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    startArchiveTransition(async () => {
      await archiveBooking(bookingId);
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    startDeleteTransition(async () => {
      await deleteBooking(bookingId);
    });
  };

  if (showDeleteConfirm) {
    return (
      <div
        className="flex items-center justify-end gap-3 animate-in fade-in-0 duration-150"
        onClick={(e) => e.preventDefault()}
      >
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Delete <span className="font-medium text-foreground">{clientName}</span>?
        </span>
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
          className="text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 px-2.5 py-1 rounded transition-colors"
        >
          {isPendingDelete ? "Deleting…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPendingArchive}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
        title="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-md shadow-md py-1 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-100">
            <button
              type="button"
              onClick={handleArchive}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/60 transition-colors"
            >
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
              Archive
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-destructive hover:bg-destructive/8 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
