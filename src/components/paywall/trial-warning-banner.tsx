"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface TrialWarningBannerProps {
  expiryDateLabel: string;
}

export function TrialWarningBanner({ expiryDateLabel }: TrialWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <p className="text-amber-800">
        <span className="font-medium">Your Focal trial ends on {expiryDateLabel}.</span>{" "}
        Subscribe now to lock in the launch price of{" "}
        <span className="font-medium">€10/month</span>.{" "}
        <Link href="/pricing" className="underline underline-offset-2 font-medium hover:text-amber-900">
          Upgrade to Pro →
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss trial warning"
        className="shrink-0 text-amber-600 hover:text-amber-800 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
