import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "./checkout-button";

const FREE_FEATURES = [
  { label: "Dashboard & command center", included: true },
  { label: "Calendar view", included: true },
  { label: "Editing workflow & deliverables", included: true },
  { label: "Up to 5 bookings per month", included: true },
  { label: "Up to 2 package templates", included: true },
  { label: "Up to 3 expenses per month", included: true },
  { label: "Google Calendar sync", included: false },
  { label: "Insights & analytics", included: false },
  { label: "Inquiry forms", included: false },
  { label: "Second shooter collaboration", included: false },
];

const PRO_FEATURES = [
  { label: "Everything in Free", included: true },
  { label: "Unlimited bookings", included: true },
  { label: "Unlimited package templates", included: true },
  { label: "Unlimited expenses", included: true },
  { label: "Google Calendar sync", included: true },
  { label: "Insights & analytics", included: true },
  { label: "Inquiry forms", included: true },
  { label: "Second shooter collaboration", included: true },
  { label: "Contract signing (coming soon)", included: true },
];

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Simple, honest pricing</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free. Upgrade when you’re ready. Early subscribers lock in our launch price forever.
        </p>
      </div>

      {/* Launch pricing callout */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <span className="font-semibold">Launch offer:</span> Subscribe before 31 July 2026 to lock in{" "}
        <span className="font-semibold">€10/month forever</span>. Price increases to €15/month after launch.
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Free */}
        <Card>
          <CardHeader className="pb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">No credit card required</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button variant="outline" className="w-full" disabled>
              Current plan
            </Button>
            <FeatureList features={FREE_FEATURES} />
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="border-primary shadow-sm relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-3">Most popular</Badge>
          </div>
          <CardHeader className="pb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pro</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">€10</span>
                <span className="text-muted-foreground mb-1">/month</span>
                <span className="ml-1 text-xs line-through text-muted-foreground mb-1">€15</span>
              </div>
              <p className="text-sm text-amber-700 font-medium">Launch price — locked in forever</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <CheckoutButton plan="monthly" label="Subscribe monthly — €10/month" />
              <CheckoutButton
                plan="annual"
                label="Subscribe annually — €100/year (save 2 months)"
                variant="outline"
              />
            </div>
            <FeatureList features={PRO_FEATURES} />
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Prices include VAT where applicable. Cancel anytime from your account settings.
        Payments processed securely by Lemon Squeezy.
      </p>
    </div>
  );
}

function FeatureList({ features }: { features: { label: string; included: boolean }[] }) {
  return (
    <ul className="space-y-2">
      {features.map((f) => (
        <li key={f.label} className="flex items-center gap-2.5 text-sm">
          {f.included ? (
            <Check className="h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <X className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          )}
          <span className={f.included ? "" : "text-muted-foreground"}>{f.label}</span>
        </li>
      ))}
    </ul>
  );
}
