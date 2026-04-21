import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Focal Planner",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Coming soon
        </p>
      </div>

      <div className="h-px bg-border" aria-hidden="true" />

      <div className="space-y-5 max-w-[65ch]">
        <p
          className="text-base leading-relaxed text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Our full Terms of Service are being prepared and will be published here shortly.
        </p>

        <p
          className="text-base leading-relaxed text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          In the meantime, here is a brief summary of the key points:
        </p>

        <ul
          className="space-y-4 text-base text-muted-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              <strong className="text-foreground font-medium">Service</strong>{" "}
              Focal Planner is a business management tool for photographers. You may use it to manage bookings, packages, expenses, and client communications.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              <strong className="text-foreground font-medium">Your data</strong>{" "}
              You retain ownership of all data you enter into Focal Planner. We process it solely to provide the service to you.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              <strong className="text-foreground font-medium">Subscriptions</strong>{" "}
              Paid plans are billed through our payment provider. You may cancel at any time and your access continues until the end of the billing period.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary mt-0.5 shrink-0" aria-hidden="true">—</span>
            <span>
              <strong className="text-foreground font-medium">Acceptable use</strong>{" "}
              You agree not to misuse the service, attempt to access other users&apos; data, or use Focal Planner for any unlawful purpose.
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
          Questions about these terms?
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
        </Link>{" "}
        and{" "}
        <Link
          href="/cookie-policy"
          className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
        >
          Cookie Policy
        </Link>
      </p>
    </div>
  );
}
