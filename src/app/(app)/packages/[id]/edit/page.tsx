import { notFound } from "next/navigation";
import { getPackageTemplateById } from "@/lib/queries/packages";
import { getCustomFieldDefinitions, getCustomFieldsForVersion } from "@/lib/queries/custom-fields";
import { PackageForm } from "@/components/packages/package-form";
import { updatePackage } from "@/lib/actions/packages";
import type { PackageFormValues } from "@/lib/types/forms";
import type { PackageVersion } from "@/lib/types";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { template } = await getPackageTemplateById(id).catch(() => notFound());

  const v: PackageVersion | null = template.current_version;

  const [customFieldDefinitions, existingCustomFields] = await Promise.all([
    getCustomFieldDefinitions(),
    v ? getCustomFieldsForVersion(v.id) : Promise.resolve([]),
  ]);

  const defaultValues: Partial<PackageFormValues> = v
    ? {
        name: template.name,
        description: v.description,
        base_price: v.base_price,
        currency: v.currency,
        hours_of_coverage: v.hours_of_coverage,
        custom_fields: customFieldDefinitions.map((def) => {
          const saved = existingCustomFields.find(
            (cf) => cf.field_definition_id === def.id
          );
          return {
            field_definition_id: def.id,
            value_text: saved?.value_text ?? null,
            value_bool: saved?.value_bool ?? null,
          };
        }),
      }
    : { name: template.name };

  async function handleUpdate(values: PackageFormValues) {
    "use server";
    await updatePackage(id, values);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Package</h1>
      <PackageForm
        defaultValues={defaultValues}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        currentVersionNumber={v?.version_number ?? 0}
        customFieldDefinitions={customFieldDefinitions}
      />
    </div>
  );
}
