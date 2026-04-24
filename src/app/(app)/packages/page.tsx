import Link from "next/link";
import { getPackageTemplates, getPackageTemplatesCount } from "@/lib/queries/packages";
import { getExtras } from "@/lib/queries/extras";
import { PackageCard } from "@/components/packages/package-card";
import { ExtrasCatalog } from "@/components/extras/extras-catalog";
import { NewPackageButton } from "@/components/paywall/new-package-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Tab = "packages" | "extras";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "extras" ? "extras" : "packages";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [packages, extras, photographer, packageCount] = await Promise.all([
    activeTab === "packages" ? getPackageTemplates() : Promise.resolve([]),
    activeTab === "extras" ? getExtras() : Promise.resolve([]),
    supabase.from("photographers").select("default_currency").eq("id", user.id).single(),
    getPackageTemplatesCount(),
  ]);

  const defaultCurrency =
    (photographer.data as { default_currency: string } | null)?.default_currency ?? "EUR";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {activeTab === "packages" ? "Packages" : "Extras"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[52ch] leading-relaxed">
            {activeTab === "packages"
              ? "Your service offerings. Each package keeps a full version history — update pricing any time without touching existing bookings."
              : "Reusable add-ons you can attach to any booking — drone footage, second shooters, rush editing."}
          </p>
        </div>
        {activeTab === "packages" && packages.length > 0 && (
          <div className="shrink-0 pt-1">
            <NewPackageButton currentCount={packageCount} />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b mb-8">
        <Link
          href="/packages"
          className={`pb-2.5 text-sm transition-colors border-b-2 -mb-px ${
            activeTab === "packages"
              ? "text-foreground font-medium border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Packages
        </Link>
        <Link
          href="/packages?tab=extras"
          className={`pb-2.5 text-sm transition-colors border-b-2 -mb-px ${
            activeTab === "extras"
              ? "text-foreground font-medium border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Extras
        </Link>
      </div>

      {/* Content */}
      {activeTab === "packages" ? (
        packages.length === 0 ? (
          <PackagesEmptyState packageCount={packageCount} />
        ) : (
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              alignItems: "start",
            }}
          >
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        )
      ) : (
        <ExtrasCatalog extras={extras} defaultCurrency={defaultCurrency} />
      )}
    </div>
  );
}

function PackagesEmptyState({ packageCount }: { packageCount: number }) {
  return (
    <div className="py-12 max-w-[500px]">
      <h2
        className="text-xl font-semibold mb-3"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        No packages yet
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        A package is your core offering — a name clients recognize, with pricing
        and coverage that you can update each season. Here&apos;s how they work:
      </p>

      <div className="space-y-5 mb-8">
        <div className="flex items-start gap-4">
          <span
            className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            01
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Package</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              The name that stays constant — &ldquo;Gold Package&rdquo;, &ldquo;Elopement Session&rdquo;,
              &ldquo;Half Day&rdquo;. This is what clients see on proposals.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span
            className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            02
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Version</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              The specific pricing period — &ldquo;Summer 2025&rdquo;, &ldquo;Winter Base&rdquo;.
              Each version holds the price, hours, and deliverables for that period.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span
            className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            03
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Bookings are locked</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Every booking is tied to a specific version. Create a new version to update
              your rates — existing bookings are never changed.
            </p>
          </div>
        </div>
      </div>

      <NewPackageButton currentCount={packageCount} />
    </div>
  );
}
