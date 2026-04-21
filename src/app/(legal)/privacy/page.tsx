import type { Metadata } from "next";
import { PRIVACY_POLICY_HTML } from "./content";

export const metadata: Metadata = {
  title: "Privacy Policy — Focal Planner",
};

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        .focal-policy {
          --policy-text: oklch(0.28 0.01 60);
          --policy-muted: oklch(0.45 0.015 65);
          --policy-link: oklch(0.45 0.1 55);
          --policy-border: oklch(0.88 0.01 75);
          --policy-heading: oklch(0.18 0.01 60);
        }
        .focal-policy [data-custom-class="title"],
        .focal-policy [data-custom-class="title"] * {
          font-family: var(--font-heading) !important;
          font-size: 2rem !important;
          color: var(--policy-heading) !important;
          letter-spacing: -0.01em;
        }
        .focal-policy [data-custom-class="subtitle"],
        .focal-policy [data-custom-class="subtitle"] * {
          font-family: var(--font-body) !important;
          font-size: 0.8125rem !important;
          color: var(--policy-muted) !important;
        }
        .focal-policy [data-custom-class="heading_1"],
        .focal-policy [data-custom-class="heading_1"] * {
          font-family: var(--font-heading) !important;
          font-size: 1.125rem !important;
          color: var(--policy-heading) !important;
        }
        .focal-policy [data-custom-class="heading_2"],
        .focal-policy [data-custom-class="heading_2"] * {
          font-family: var(--font-heading) !important;
          font-size: 1rem !important;
          color: var(--policy-heading) !important;
        }
        .focal-policy [data-custom-class="body_text"],
        .focal-policy [data-custom-class="body_text"] * {
          font-family: var(--font-body) !important;
          font-size: 0.9375rem !important;
          color: var(--policy-text) !important;
          line-height: 1.7 !important;
        }
        .focal-policy [data-custom-class="link"],
        .focal-policy [data-custom-class="link"] * {
          color: var(--policy-link) !important;
          font-family: var(--font-body) !important;
          font-size: 0.9375rem !important;
        }
        .focal-policy h1 { margin-bottom: 0.25rem; }
        .focal-policy h2 {
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--policy-border);
        }
        .focal-policy h3 {
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .focal-policy ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        .focal-policy li {
          margin-bottom: 0.375rem;
        }
        .focal-policy table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          margin: 1rem 0;
        }
        .focal-policy table td,
        .focal-policy table th {
          padding: 0.625rem 0.75rem;
          font-family: var(--font-body) !important;
          color: var(--policy-text) !important;
        }
        .focal-policy > span[style*="display: block"] {
          display: none !important;
        }
        .focal-policy a[href*="termly"] + div {
          display: none;
        }
      `}</style>

      <div className="focal-policy">
        <div dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }} />
      </div>

      <p
        className="mt-16 pt-8 border-t border-border text-xs text-muted-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Questions about this policy?{" "}
        <a
          href="mailto:support@focalplanner.com"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          support@focalplanner.com
        </a>
      </p>
    </>
  );
}
