"use client";

import { useSubscription } from "@/lib/contexts/subscription-context";
import type { UsageLimitKey } from "@/config/plans";
import { PLANS } from "@/config/plans";
import Link from "next/link";

interface UsageLimitProps {
  resource: UsageLimitKey;
  currentCount: number;
  /** Rendered when under the limit — typically the "Create" button */
  children: React.ReactNode;
  /** Human-readable resource name for the limit message (e.g. "bookings this month") */
  resourceLabel: string;
}

export function UsageLimit({
  resource,
  currentCount,
  children,
  resourceLabel,
}: UsageLimitProps) {
  const { tier, remaining, atLimit } = useSubscription();

  // Unlimited on pro/trial — render children as-is
  if (tier === "pro" || tier === "trial") return <>{children}</>;

  const limit = PLANS.free.limits[resource];
  const left = remaining(resource, currentCount);
  const blocked = atLimit(resource, currentCount);

  return (
    <div className="flex flex-col gap-1">
      {blocked ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Limit reached ({limit} {resourceLabel}).{" "}
            <Link href="/pricing" className="font-medium text-foreground underline underline-offset-2">
              Upgrade to Pro
            </Link>{" "}
            for unlimited access.
          </span>
        </div>
      ) : (
        <>
          {children}
          {left !== null && left <= 2 && (
            <p className="text-xs text-muted-foreground">
              {left} {resourceLabel} remaining.{" "}
              <Link href="/pricing" className="font-medium underline underline-offset-2">
                Upgrade
              </Link>{" "}
              for unlimited.
            </p>
          )}
        </>
      )}
    </div>
  );
}
