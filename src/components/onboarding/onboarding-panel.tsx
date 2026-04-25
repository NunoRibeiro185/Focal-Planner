import Link from "next/link";

export function OnboardingPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[52ch]">
        The getting-started tour walks you through packages & versions, extras, deliverables, the booking lifecycle, second shooter invites, and your public inquiry page.
      </p>
      <Link
        href="/onboarding"
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
      >
        Review the tour →
      </Link>
    </div>
  );
}
