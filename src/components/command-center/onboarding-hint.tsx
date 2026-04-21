"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Package, CalendarPlus } from "lucide-react";

const DISMISS_KEY = "focal_onboarding_dismissed";

export function OnboardingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">Get started with Focal Planner</p>
          <div className="space-y-2">
            <Link
              href="/packages/new"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">1</span>
              <Package className="h-3.5 w-3.5 shrink-0 text-primary/60" strokeWidth={1.5} />
              <span>Set up a package — your rates, hours, and deliverables</span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
            <Link
              href="/bookings/new"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-bold">2</span>
              <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
              <span>Add your first booking</span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </Link>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
