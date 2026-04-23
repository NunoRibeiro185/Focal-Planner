import Link from "next/link";
import { PackageForm } from "@/components/packages/package-form";
import { createPackage } from "@/lib/actions/packages";
import { getCustomFieldDefinitions } from "@/lib/queries/custom-fields";
import type { PackageFormValues } from "@/lib/types/forms";

export default async function NewPackagePage() {
  const customFieldDefinitions = await getCustomFieldDefinitions();

  async function handleCreate(values: PackageFormValues) {
    "use server";
    await createPackage(values);
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
          Give your package a name, set the pricing, and define what you&apos;ll
          track on every booking that uses it.
        </p>
      </div>

      <PackageForm
        onSubmit={handleCreate}
        submitLabel="Create Package"
        isNewVersion
        customFieldDefinitions={customFieldDefinitions}
      />
    </div>
  );
}
