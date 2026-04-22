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
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Package</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give your package a name, set pricing, then add the deliverables you&apos;ll track on every booking.
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
