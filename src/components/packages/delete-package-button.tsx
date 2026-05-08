"use client";

import { useState, useTransition } from "react";
import { togglePackageArchived } from "@/lib/actions/packages";
import { getFormsUsingPackage, removePackageFromAllForms } from "@/lib/actions/inquiry-forms";

interface DeletePackageButtonProps {
  templateId: string;
}

export function DeletePackageButton({ templateId }: DeletePackageButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [affectedForms, setAffectedForms] = useState<string[] | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleDeleteClick() {
    setIsChecking(true);
    const forms = await getFormsUsingPackage(templateId);
    setAffectedForms(forms);
    setIsChecking(false);
    setConfirming(true);
  }

  function handleConfirm() {
    startTransition(async () => {
      if (affectedForms && affectedForms.length > 0) {
        await removePackageFromAllForms(templateId);
      }
      await togglePackageArchived(templateId, true);
    });
  }

  if (confirming) {
    return (
      <span className="flex flex-col gap-1.5 text-xs">
        {affectedForms && affectedForms.length > 0 && (
          <span className="text-destructive/80">
            This package is used in {affectedForms.length === 1 ? "1 form" : `${affectedForms.length} forms`}:{" "}
            <span className="font-medium">{affectedForms.join(", ")}</span>. It will be removed from {affectedForms.length === 1 ? "that form" : "those forms"}.
          </span>
        )}
        <span className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="text-destructive hover:text-destructive/70 transition-colors disabled:opacity-50"
          >
            {isPending ? "Deleting…" : "Confirm"}
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            onClick={() => { setConfirming(false); setAffectedForms(null); }}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </span>
      </span>
    );
  }

  return (
    <button
      onClick={handleDeleteClick}
      disabled={isChecking}
      className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
    >
      {isChecking ? "Checking…" : "Delete"}
    </button>
  );
}
