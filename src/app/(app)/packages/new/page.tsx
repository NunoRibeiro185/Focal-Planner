import Link from "next/link";
import { PackageForm, type PackageServiceItem } from "@/components/packages/package-form";
import { createPackage } from "@/lib/actions/packages";
import { getServices } from "@/lib/queries/services";
import type { PackageFormValues } from "@/lib/types/forms";

export default async function NewPackagePage() {
  const services = await getServices();

  async function handleCreate(values: PackageFormValues, serviceItems: PackageServiceItem[]) {
    "use server";
    await createPackage(values, serviceItems);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link
          href="/packages"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          ← Packages
        </Link>
        <h1
          className="text-3xl font-semibold tracking-[-0.02em] mt-1"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          New Package
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[44ch]">
          Give your package a name, set the pricing, and pick the services to include.
        </p>
      </div>

      <PackageForm
        services={services}
        onSubmit={handleCreate}
        submitLabel="Create Package"
      />
    </div>
  );
}
