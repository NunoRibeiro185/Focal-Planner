import Link from "next/link";
import { getPackageTemplates } from "@/lib/queries/packages";
import { getExtras } from "@/lib/queries/extras";
import { PackageCard } from "@/components/packages/package-card";
import { ExtrasCatalog } from "@/components/extras/extras-catalog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

  const [packages, extras, photographer] = await Promise.all([
    activeTab === "packages" ? getPackageTemplates() : Promise.resolve([]),
    activeTab === "extras" ? getExtras() : Promise.resolve([]),
    supabase
      .from("photographers")
      .select("default_currency")
      .eq("id", user.id)
      .single(),
  ]);

  const defaultCurrency =
    (photographer.data as { default_currency: string } | null)?.default_currency ?? "EUR";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Packages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeTab === "packages"
              ? "Manage your service packages. Editing creates a new version — existing bookings are never affected."
              : "Define reusable add-ons to attach to bookings."}
          </p>
        </div>
        {activeTab === "packages" && (
          <Button asChild>
            <Link href="/packages/new">
              <Plus className="h-4 w-4" />
              New Package
            </Link>
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b">
        <Link
          href="/packages"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "packages"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Packages
        </Link>
        <Link
          href="/packages?tab=extras"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "extras"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Extras
        </Link>
      </div>

      {/* Tab content */}
      {activeTab === "packages" ? (
        packages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No packages yet</p>
            <p className="text-sm mt-1">Create your first package to get started.</p>
            <Button asChild className="mt-4">
              <Link href="/packages/new">
                <Plus className="h-4 w-4" />
                New Package
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
