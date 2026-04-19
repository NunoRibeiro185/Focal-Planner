"use client";

import { useSubscription } from "@/lib/contexts/subscription-context";
import type { FeatureKey } from "@/config/plans";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Custom message shown in the upgrade prompt */
  description?: string;
}

export function FeatureGate({ feature, children, description }: FeatureGateProps) {
  const { canUse } = useSubscription();

  if (canUse(feature)) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Pro feature</p>
        <p className="text-sm text-muted-foreground">
          {description ?? "Upgrade to Pro to unlock this feature."}
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/pricing">Upgrade to Pro</Link>
      </Button>
    </div>
  );
}
