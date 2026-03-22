"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { togglePackageArchived } from "@/lib/actions/packages";

interface DeletePackageButtonProps {
  templateId: string;
}

export function DeletePackageButton({ templateId }: DeletePackageButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDeleteClick() {
    setConfirming(true);
  }

  function handleCancel() {
    setConfirming(false);
  }

  function handleConfirm() {
    startTransition(async () => {
      await togglePackageArchived(templateId, true);
    });
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleDeleteClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </Button>
  );
}
