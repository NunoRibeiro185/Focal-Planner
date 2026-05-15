import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackageTemplateById } from "@/lib/queries/packages";
import { PackageForm } from "@/components/packages/package-form";
import { createPackageVersion } from "@/lib/actions/packages";
import type { PackageFormValues } from "@/lib/types/forms";
import type { PackageVersion } from "@/lib/types";

export default async function NewVersionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { template } = await getPackageTemplateById(id).catch(() => notFound());

  const v: PackageVersion | null = template.current_version;

  const defaultValues: Partial<PackageFormValues> = v
    ? {
        name: template.name,
        version_name: "",
        description: v.description,
        base_price: v.base_price,
        currency: v.currency,
        hours_of_coverage: v.hours_of_coverage,
      }
    : { name: template.name, version_name: "" };

  async function handleCreate(values: PackageFormValues) {
    "use server";
    await createPackageVersion(id, values);
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
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1 mb-1">
          {template.name}
        </p>
        <h1
          className="text-3xl font-semibold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          New Version
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[44ch]">
          Pre-filled from the current version. Name this version, adjust the details, and save.
          Existing bookings are never affected.
        </p>
      </div>

      <PackageForm
        defaultValues={defaultValues}
        onSubmit={handleCreate}
        submitLabel="Create Version"
        isNewVersion
      />
    </div>
  );
}
