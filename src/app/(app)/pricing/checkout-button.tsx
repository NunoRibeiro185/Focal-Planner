"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/lib/types/database";
import { Loader2 } from "lucide-react";

interface CheckoutButtonProps {
  plan: SubscriptionPlan;
  label: string;
  variant?: "default" | "outline";
}

export function CheckoutButton({ plan, label, variant = "default" }: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Checkout failed");
        window.location.href = json.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-1">
      <Button
        variant={variant}
        className="w-full"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
