"use client";

import { useState, useTransition, useMemo } from "react";
import { grantPro, revokePro } from "@/lib/actions/admin";
import type { AdminPhotographer } from "@/lib/queries/admin";
import { format } from "date-fns";
import { getEffectiveTier } from "@/lib/services/entitlements";

interface AdminShellProps {
  photographers: AdminPhotographer[];
}

export function AdminShell({ photographers: initial }: AdminShellProps) {
  const [photographers, setPhotographers] = useState(initial);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return photographers.filter(
      (p) =>
        p.email.toLowerCase().includes(q) ||
        (p.full_name ?? "").toLowerCase().includes(q)
    );
  }, [photographers, search]);

  function handleGrant(id: string) {
    startTransition(async () => {
      await grantPro(id);
      setPhotographers((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                subscription: {
                  status: "active",
                  plan: "annual",
                  current_period_end: "2099-12-31T23:59:59.000Z",
                  admin_granted: true,
                },
              }
            : p
        )
      );
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokePro(id);
      setPhotographers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (p.subscription?.admin_granted) {
            return { ...p, subscription: null };
          }
          return {
            ...p,
            subscription: p.subscription
              ? { ...p.subscription, status: "cancelled" }
              : null,
          };
        })
      );
    });
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {photographers.length} users
          </p>
        </div>

        <input
          type="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
        />

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-left font-medium">Tier</th>
                <th className="px-4 py-3 text-left font-medium">Expires</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const tier = getEffectiveTier(
                  p.subscription
                    ? {
                        photographer_id: p.id,
                        lemon_squeezy_subscription_id: p.subscription.admin_granted
                          ? `admin_grant_${p.id}`
                          : "real",
                        lemon_squeezy_customer_id: "",
                        status: p.subscription.status as "active" | "cancelled" | "past_due" | "paused",
                        plan: p.subscription.plan as "monthly" | "annual",
                        price_locked: false,
                        current_period_end: p.subscription.current_period_end,
                        created_at: "",
                        updated_at: "",
                      }
                    : null
                );
                const isPro = tier === "pro" || tier === "trial";

                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(p.created_at), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge
                        tier={tier}
                        adminGranted={p.subscription?.admin_granted ?? false}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.subscription
                        ? p.subscription.admin_granted
                          ? "∞"
                          : format(new Date(p.subscription.current_period_end), "d MMM yyyy")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPro ? (
                        <button
                          onClick={() => handleRevoke(p.id)}
                          disabled={isPending}
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                        >
                          Revoke Pro
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrant(p.id)}
                          disabled={isPending}
                          className="text-xs font-medium text-foreground hover:underline disabled:opacity-50"
                        >
                          Grant Pro
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TierBadge({
  tier,
  adminGranted,
}: {
  tier: string;
  adminGranted: boolean;
}) {
  if (tier === "pro") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        Pro
        {adminGranted && (
          <span className="text-muted-foreground font-normal">(admin)</span>
        )}
      </span>
    );
  }
  if (tier === "trial") {
    return (
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
        Trial
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Free</span>
  );
}
