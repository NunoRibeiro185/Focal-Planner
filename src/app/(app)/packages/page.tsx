import Link from "next/link";
import { Plus } from "lucide-react";
import { getPackageTemplates, getPackageTemplatesCount } from "@/lib/queries/packages";
import { getServices } from "@/lib/queries/services";
import { PackageCard } from "@/components/packages/package-card";
import { ServicesCatalog } from "@/components/services/services-catalog";
import { NewPackageButton } from "@/components/paywall/new-package-button";
import { UsageLimit } from "@/components/paywall/usage-limit";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Tab = "packages" | "services";

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "services" ? "services" : "packages";

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

  const [packages, services, photographer, packageCount] = await Promise.all([
    activeTab === "packages" ? getPackageTemplates() : Promise.resolve([]),
    activeTab === "services" ? getServices() : Promise.resolve([]),
    photographerPromise,
    getPackageTemplatesCount(),
  ]);

  const defaultCurrency =
    (photographer.data as { default_currency: string } | null)?.default_currency ?? "EUR";

  const headings: Record<Tab, { title: string; description: string }> = {
    packages: {
      title: "Packages",
      description:
        "Your service offerings — a name, pricing, coverage hours, and the services included. Edit anytime.",
    },
    services: {
      title: "Services",
      description:
        "Reusable line items you can add to any booking or package — drone footage, albums, rush editing, extra hours.",
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
        <TabLink href="/packages?tab=services" active={activeTab === "services"}>
          Services
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
      ) : (
        <ServicesCatalog services={services} defaultCurrency={defaultCurrency} />
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
        A package is your core offering — a name clients recognize, a price, coverage hours,
        and the services included. You can edit it at any time.
      </p>

      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        Consider{" "}
        <Link
          href="/packages?tab=services"
          className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
        >
          setting up your services first
        </Link>
        {" "}— you can bundle them into the package right away.
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

