import Link from "next/link";
import { Plus } from "lucide-react";
import { getPackageTemplates, getPackageTemplatesCount } from "@/lib/queries/packages";
import { getExtras } from "@/lib/queries/extras";
import { getCustomFieldDefinitions } from "@/lib/queries/custom-fields";
import { PackageCard } from "@/components/packages/package-card";
import { ExtrasCatalog } from "@/components/extras/extras-catalog";
import { DeliverablesCatalog } from "@/components/deliverables/deliverables-catalog";
import { NewPackageButton } from "@/components/paywall/new-package-button";
import { UsageLimit } from "@/components/paywall/usage-limit";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Tab = "packages" | "extras" | "deliverables";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab =
    tab === "extras" ? "extras" : tab === "deliverables" ? "deliverables" : "packages";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const photographerPromise = supabase
    .from("photographers")
    .select("default_currency")
    .eq("id", user.id)
    .single();

  const [packages, extras, deliverables, photographer, packageCount] = await Promise.all([
    activeTab === "packages" ? getPackageTemplates() : Promise.resolve([]),
    activeTab === "extras" ? getExtras() : Promise.resolve([]),
    activeTab === "deliverables" ? getCustomFieldDefinitions() : Promise.resolve([]),
    photographerPromise,
    getPackageTemplatesCount(),
  ]);

  const defaultCurrency =
    (photographer.data as { default_currency: string } | null)?.default_currency ?? "EUR";

  const headings: Record<Tab, { title: string; description: string }> = {
    packages: {
      title: "Packages",
      description:
        "Your service offerings. Each package keeps a full version history — update pricing any time without touching existing bookings.",
    },
    extras: {
      title: "Extras",
      description:
        "Reusable add-ons you can attach to any booking — drone footage, second shooters, rush editing.",
    },
    deliverables: {
      title: "Deliverables",
      description:
        "The items you promise to every client. Define them once here and they'll appear as trackable fields on each booking.",
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {headings[activeTab].title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[52ch] leading-relaxed">
            {headings[activeTab].description}
          </p>
        </div>
        {activeTab === "packages" && packages.length > 0 && (
          <div className="shrink-0 pt-1">
            <NewPackageButton currentCount={packageCount} />
          </div>
        )}
      </div>

      <div className="flex gap-6 border-b mb-8">
        <TabLink href="/packages" active={activeTab === "packages"}>
          Packages
        </TabLink>
        <TabLink href="/packages?tab=deliverables" active={activeTab === "deliverables"}>
          Deliverables
        </TabLink>
        <TabLink href="/packages?tab=extras" active={activeTab === "extras"}>
          Extras
        </TabLink>
      </div>

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
      ) : activeTab === "extras" ? (
        <ExtrasCatalog extras={extras} defaultCurrency={defaultCurrency} />
      ) : (
        <DeliverablesCatalog fields={deliverables} />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`pb-2.5 text-sm transition-colors border-b-2 -mb-px ${
        active
          ? "text-foreground font-medium border-primary"
          : "text-muted-foreground hover:text-foreground border-transparent"
      }`}
    >
      {children}
    </Link>
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
        <TutorialStep number="01" title="Package">
          The name that stays constant — &ldquo;Gold Package&rdquo;, &ldquo;Elopement
          Session&rdquo;, &ldquo;Half Day&rdquo;. This is what clients see on proposals.
        </TutorialStep>
        <TutorialStep number="02" title="Version">
          The specific pricing period — &ldquo;Summer 2025&rdquo;, &ldquo;Winter Base&rdquo;.
          Each version holds the price, hours, and deliverables for that period.
        </TutorialStep>
        <TutorialStep number="03" title="Bookings are locked">
          Every booking is tied to a specific version. Create a new version to update your
          rates — existing bookings are never changed.
        </TutorialStep>
      </div>

      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        Before creating a package, consider{" "}
        <Link
          href="/packages?tab=deliverables"
          className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
        >
          setting up your deliverables first
        </Link>
        {" "}— you can include them in the package right away.
      </p>

      <UsageLimit resource="packagesTotal" currentCount={packageCount} resourceLabel="packages">
        <Link
          href="/packages/new"
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Create your first package
        </Link>
      </UsageLimit>
    </div>
  );
}

export function TutorialStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        className="text-xs font-medium text-primary/60 w-5 shrink-0 mt-0.5 tabular-nums"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {number}
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
