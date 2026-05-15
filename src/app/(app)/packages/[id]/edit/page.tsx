import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackageTemplateById } from "@/lib/queries/packages";
import { getServices } from "@/lib/queries/services";
import { PackageForm, type PackageServiceItem } from "@/components/packages/package-form";
import { updatePackage } from "@/lib/actions/packages";
import type { PackageFormValues } from "@/lib/types/forms";
import type { PackageVersion } from "@/lib/types";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ template, existingServices }, services] = await Promise.all([
    getPackageTemplateById(id).catch(() => notFound()),
    getServices(),
  ]);

  const v: PackageVersion | null = template.current_version;

  const defaultValues: Partial<PackageFormValues> = v
    ? {
        name: template.name,
        description: v.description,
        base_price: v.base_price,
        currency: v.currency,
        hours_of_coverage: v.hours_of_coverage,
      }
    : { name: template.name };

  async function handleUpdate(values: PackageFormValues, serviceItems: PackageServiceItem[]) {
    "use server";
    await updatePackage(id, values, serviceItems);
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
          className="text-3xl font-semibold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Edit Package
        </h1>
      </div>

      <PackageForm
        defaultValues={defaultValues}
        defaultServices={existingServices}
        services={services}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}
