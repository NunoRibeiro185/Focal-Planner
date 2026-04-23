"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteAccountPanel() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
      } catch {
        setError("Something went wrong. Please try again or contact support.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-widest uppercase text-destructive/70">
        Danger zone
      </p>
      <p className="text-sm text-muted-foreground">
        Permanently delete your account and all associated data — bookings,
        packages, expenses, and everything else. This cannot be undone.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isPending}>
            {isPending ? "Deleting…" : "Delete my account"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all data associated
              with it — bookings, clients, packages, expenses, and more. There
              is no way to recover this data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
