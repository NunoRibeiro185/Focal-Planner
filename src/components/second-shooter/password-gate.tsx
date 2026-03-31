"use client";

import { useState, useTransition } from "react";
import { verifySecondShooterAccess } from "@/lib/actions/second-shooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface PasswordGateProps {
  bookingId: string;
  onSuccess: () => void;
}

export function PasswordGate({ bookingId, onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError(null);

    startTransition(async () => {
      const result = await verifySecondShooterAccess(bookingId, password);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error ?? "Incorrect password.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-semibold">Second Shooter Access</h1>
          <p className="text-sm text-muted-foreground">
            Enter the password provided by your photographer to view this booking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              disabled={isPending}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending || !password}>
            {isPending ? "Verifying…" : "Access booking"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground/50">Powered by Focal</p>
      </div>
    </div>
  );
}
