"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LAUNCH_WINDOW } from "@/config/plans";
import type { Subscription, SubscriptionPlan } from "@/lib/types/database";
import type { EffectiveTier } from "@/config/plans";

interface PlanBillingPanelProps {
  subscription: Subscription | null;
  tier: EffectiveTier;
  checkoutSuccess?: boolean;
}

const PRO_FEATURES = [
  "Unlimited bookings, packages & expenses",
  "Google Calendar sync",
  "Insights & analytics",
  "Inquiry forms & contract signing",
];

type PanelState =
  | "trial_nosub"
  | "trial_sub"
  | "free"
  | "pro_active"
  | "pro_cancelled"
  | "past_due";

function resolvePanelState(
  subscription: Subscription | null,
  tier: EffectiveTier
): PanelState {
  if (tier === "trial") {
    return subscription?.status === "active" ? "trial_sub" : "trial_nosub";
  }
  if (!subscription) return "free";
  if (subscription.status === "past_due") return "past_due";
  if (subscription.status === "cancelled") {
    return new Date(subscription.current_period_end) > new Date()
      ? "pro_cancelled"
      : "free";
  }
  if (subscription.status === "active") return "pro_active";
  return "free";
}

export function PlanBillingPanel({ subscription, tier, checkoutSuccess }: PlanBillingPanelProps) {
  const router = useRouter();
  const panelState = resolvePanelState(subscription, tier);
  const refresh = () => router.refresh();

  useEffect(() => {
    if (checkoutSuccess) {
      toast.success("You're subscribed!", { description: "Your Pro plan is now active." });
    }
  }, [checkoutSuccess]);

  if (panelState === "trial_nosub") return <TrialNoSubState />;
  if (panelState === "trial_sub")
    return <TrialSubState subscription={subscription!} onRefresh={refresh} />;
  if (panelState === "free") return <FreeState />;
  if (panelState === "pro_cancelled")
    return <ProCancelledState subscription={subscription!} />;
  if (panelState === "past_due") return <PastDueState />;
  return <ProActiveState subscription={subscription!} onRefresh={refresh} />;
}

// ─── Shared helpers ────────────────────────────────────────

function PlanLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-border/60" />;
}

function ExpandPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: "grid-template-rows 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflow: "hidden" }}>{children}</div>
    </div>
  );
}

async function doCheckout(plan: SubscriptionPlan): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Checkout failed");
  window.location.href = json.url;
}

function PlanToggle({
  value,
  onChange,
}: {
  value: SubscriptionPlan;
  onChange: (v: SubscriptionPlan) => void;
}) {
  return (
    <div className="inline-flex items-center bg-muted rounded-md p-1">
      {(["monthly", "annual"] as SubscriptionPlan[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "px-3 py-1.5 rounded text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === p
              ? "bg-background shadow-sm font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p === "monthly" ? "Monthly" : "Annual — save 17%"}
        </button>
      ))}
    </div>
  );
}

function PriceDisplay({ plan }: { plan: SubscriptionPlan }) {
  const current = plan === "monthly" ? "€10" : "€100";
  const regular = plan === "monthly" ? "€15" : "€150";
  const period = plan === "monthly" ? "month" : "year";

  return (
    <div className="flex items-baseline gap-2.5">
      <div>
        <span className="text-3xl font-semibold tracking-tight">{current}</span>
        <span className="text-muted-foreground text-sm ml-1">/{period}</span>
      </div>
      <span className="text-sm text-muted-foreground/60 line-through">{regular}</span>
    </div>
  );
}

// ─── Trial: no subscription yet ────────────────────────────

function TrialNoSubState() {
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const launchEnd = format(LAUNCH_WINDOW.end, "d MMMM yyyy");
  const daysLeft = Math.ceil(
    (LAUNCH_WINDOW.end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        await doCheckout(plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <PlanLabel>Current plan</PlanLabel>
        <h3 className="text-2xl">Pro Trial</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          Full Pro access until {launchEnd}.
        </p>
      </div>

      <Divider />

      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-foreground">Lock in launch pricing</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {daysLeft <= 30 ? `${daysLeft} days left. ` : ""}
            Subscribe now at €10/month — price increases to €15 after the launch window.
            Billing begins 1 August 2026.
          </p>
        </div>

        <PlanToggle value={plan} onChange={setPlan} />
        <PriceDisplay plan={plan} />

        <div className="space-y-1.5">
          <Button onClick={handleCheckout} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isPending
              ? "Redirecting…"
              : `Subscribe — ${plan === "monthly" ? "€10/month" : "€100/year"}`}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <p className="text-xs text-muted-foreground">
          Cancel anytime · Payments by Lemon Squeezy
        </p>
      </div>
    </div>
  );
}

// ─── Trial: already subscribed ─────────────────────────────

function TrialSubState({
  subscription,
  onRefresh,
}: {
  subscription: Subscription;
  onRefresh: () => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const launchEnd = format(LAUNCH_WINDOW.end, "d MMMM yyyy");
  const isMonthly = subscription.plan === "monthly";

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/subscription/cancel", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to cancel");
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <PlanLabel>Current plan</PlanLabel>
        <h3 className="text-2xl">Pro Trial</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          Full Pro access until {launchEnd}.
        </p>
      </div>

      <Divider />

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Subscribed at launch pricing
        </p>
        <p className="text-sm text-muted-foreground">
          {isMonthly ? "Monthly · €10/month" : "Annual · €100/year"} · billing
          begins 1 August 2026
        </p>
      </div>

      <div>
        <button
          onClick={() => setCancelOpen((o) => !o)}
          className="text-sm text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Cancel subscription →
        </button>

        <ExpandPanel open={cancelOpen}>
          <div className="pt-4 pb-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              Your subscription will be cancelled. You'll still have trial
              access until {launchEnd} regardless.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Cancel subscription
              </Button>
              <button
                onClick={() => setCancelOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Keep it
              </button>
            </div>
          </div>
        </ExpandPanel>
      </div>
    </div>
  );
}

// ─── Free plan ─────────────────────────────────────────────

function FreeState() {
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        await doCheckout(plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <PlanLabel>Current plan</PlanLabel>
        <h3 className="text-2xl">Free</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          5 bookings/month · 2 packages · 3 expenses
        </p>
      </div>

      <Divider />

      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-foreground">
            Upgrade to unlock:
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <PlanToggle value={plan} onChange={setPlan} />
        <PriceDisplay plan={plan} />

        <div className="space-y-1.5">
          <Button onClick={handleCheckout} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isPending ? "Redirecting…" : "Upgrade to Pro →"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <p className="text-xs text-muted-foreground">
          Cancel anytime · Payments by Lemon Squeezy
        </p>
      </div>
    </div>
  );
}

// ─── Pro: active ───────────────────────────────────────────

function ProActiveState({
  subscription,
  onRefresh,
}: {
  subscription: Subscription;
  onRefresh: () => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isMonthly = subscription.plan === "monthly";
  const renewDate = format(
    new Date(subscription.current_period_end),
    "d MMMM yyyy"
  );
  const launchPrice = isMonthly ? "€10/month" : "€100/year";
  const regularPrice = isMonthly ? "€15/month" : "€150/year";
  const priceLabel = subscription.price_locked ? launchPrice : regularPrice;
  const switchTargetLabel = isMonthly
    ? `annual — ${subscription.price_locked ? "€100/year" : "€150/year"}`
    : `monthly — ${subscription.price_locked ? "€10/month" : "€15/month"}`;

  function openSwitch() {
    setSwitchOpen((o) => !o);
    setCancelOpen(false);
    setError(null);
  }

  function openCancel() {
    setCancelOpen((o) => !o);
    setSwitchOpen(false);
    setError(null);
  }

  function handleSwitch() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/subscription/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: isMonthly ? "annual" : "monthly" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to switch");
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/subscription/cancel", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to cancel");
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <PlanLabel>Current plan</PlanLabel>
        <h3 className="text-2xl">Pro</h3>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>
            {isMonthly ? "Monthly" : "Annual"} · {priceLabel}
          </p>
          <p>Renews {renewDate}</p>
          {subscription.price_locked && (
            <p className="text-primary text-xs font-medium">
              Launch pricing — locked in forever
            </p>
          )}
        </div>
      </div>

      <Divider />

      <div className="space-y-4">
        {/* Switch billing cycle */}
        <div>
          <button
            onClick={openSwitch}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Switch to {switchTargetLabel} →
          </button>

          <ExpandPanel open={switchOpen}>
            <div className="pt-4 pb-1 space-y-3">
              <p className="text-sm text-muted-foreground">
                You'll be moved to{" "}
                {isMonthly ? "annual" : "monthly"} billing immediately.
                Lemon Squeezy will handle any proration automatically.
              </p>
              {error && switchOpen && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSwitch}
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  )}
                  Switch to {isMonthly ? "annual" : "monthly"}
                </Button>
                <button
                  onClick={() => setSwitchOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Never mind
                </button>
              </div>
            </div>
          </ExpandPanel>
        </div>

        {/* Cancel */}
        <div>
          <button
            onClick={openCancel}
            className="text-sm text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Cancel plan →
          </button>

          <ExpandPanel open={cancelOpen}>
            <div className="pt-4 pb-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Before you go — you'll lose:
                </p>
                <ul className="mt-2 space-y-1.5">
                  {PRO_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/60 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground mt-2.5">
                  Your access continues through {renewDate}.
                </p>
              </div>
              {error && cancelOpen && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  )}
                  Cancel at end of period
                </Button>
                <button
                  onClick={() => setCancelOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Keep my plan
                </button>
              </div>
            </div>
          </ExpandPanel>
        </div>
      </div>
    </div>
  );
}

// ─── Pro: cancelled (still in period) ─────────────────────

function ProCancelledState({ subscription }: { subscription: Subscription }) {
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const endDate = format(
    new Date(subscription.current_period_end),
    "d MMMM yyyy"
  );

  function handleResubscribe() {
    setError(null);
    startTransition(async () => {
      try {
        await doCheckout(plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <PlanLabel>Current plan</PlanLabel>
        <h3 className="text-2xl">Pro · Cancelled</h3>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>Access continues through {endDate}.</p>
          <p>After that, your account returns to the free plan.</p>
        </div>
      </div>

      <Divider />

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Changed your mind?</p>
        <PlanToggle value={plan} onChange={setPlan} />
        <PriceDisplay plan={plan} />
        <div className="space-y-1.5">
          <Button
            variant="outline"
            onClick={handleResubscribe}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isPending ? "Redirecting…" : "Resubscribe →"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Past due ──────────────────────────────────────────────

function PastDueState() {
  return (
    <div className="space-y-6">
      <div>
        <PlanLabel>Current plan</PlanLabel>
        <h3 className="text-2xl">Pro</h3>
        <div className="mt-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Your last payment didn't go through. Check your email for a payment
            update link from Lemon Squeezy, or contact{" "}
            <a
              href="mailto:support@focal.studio"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              support@focal.studio
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
