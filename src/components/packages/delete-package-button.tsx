"use client";

import { useState, useTransition } from "react";
import { togglePackageArchived } from "@/lib/actions/packages";

interface DeletePackageButtonProps {
  templateId: string;
}

export function DeletePackageButton({ templateId }: DeletePackageButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await togglePackageArchived(templateId, true);
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="text-destructive hover:text-destructive/70 transition-colors disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Confirm"}
        </button>
        <span className="text-muted-foreground/30">·</span>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
    >
      Delete
    </button>
  );
}
