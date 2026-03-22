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
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">New Package</h1>
      <PackageForm
        onSubmit={handleCreate}
        submitLabel="Create Package"
        customFieldDefinitions={customFieldDefinitions}
      />
    </div>
  );
}
