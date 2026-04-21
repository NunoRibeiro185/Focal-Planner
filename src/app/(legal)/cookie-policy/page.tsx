import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — Focal Planner",
};

export default function CookiePolicyPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p
          className="text-xs tracking-[0.18em] uppercase text-primary"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Legal
        </p>
        <h1
          className="text-3xl md:text-4xl font-normal tracking-tight leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Cookie Policy
        </h1>
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Coming soon
        </p>
      </div>

      <div
        className="h-px bg-border"
        aria-hidden="true"
      />

      <div className="space-y-5 max-w-[65ch]">
        <p
          className="text-base leading-relaxed text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Our full cookie policy is being prepared and will be published here shortly.
        </p>

        <p
          className="text-base leading-relaxed text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          In the meantime, here is a brief summary of how Focal Planner uses cookies:
        </p>

        <ul
          className="space-y-4 text-base text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              <strong className="text-foreground font-medium">Session cookies</strong>{" "}
              are used to keep you signed in while you use the app. These are set by Supabase, our authentication provider, and are strictly necessary for the service to function.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              <strong className="text-foreground font-medium">Analytics</strong>{" "}
              are collected by Vercel Analytics and Speed Insights. These tools are cookieless and do not use tracking cookies or cross-site identifiers.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              We do{" "}
              <strong className="text-foreground font-medium">not</strong>{" "}
              use advertising cookies, third-party tracking cookies, or any cookies for profiling or retargeting.
            </span>
          </li>
        </ul>
      </div>

      <div
        className="rounded-none border border-border p-6 space-y-2"
        style={{ background: "oklch(0.96 0.008 78)" }}
      >
        <p
          className="text-sm font-medium text-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Questions about cookies?
        </p>
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Email us at{" "}
          <a
            href="mailto:support@focalplanner.com"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            support@focalplanner.com
          </a>
        </p>
      </div>

      <p
        className="text-sm text-muted-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        See also our{" "}
        <Link
          href="/privacy"
          className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
