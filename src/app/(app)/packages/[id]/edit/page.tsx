import { notFound } from "next/navigation";
import { getPackageTemplateById } from "@/lib/queries/packages";
import { getCustomFieldDefinitions, getCustomFieldsForVersion } from "@/lib/queries/custom-fields";
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

  const [customFieldDefinitions, existingCustomFields] = await Promise.all([
    getCustomFieldDefinitions(),
    v ? getCustomFieldsForVersion(v.id) : Promise.resolve([]),
  ]);

  const defaultValues: Partial<PackageFormValues> = v
    ? {
        name: template.name,
        version_name: "",
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
    : { name: template.name, version_name: "" };

  async function handleCreate(values: PackageFormValues) {
    "use server";
    await createPackageVersion(id, values);
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">{template.name}</p>
        <h1 className="text-2xl font-bold">New Version</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Pre-filled from the current version. Give this version a name, adjust the details, then save.
          Existing bookings are never affected.
        </p>
      </div>
      <PackageForm
        defaultValues={defaultValues}
        onSubmit={handleCreate}
        submitLabel="Create Version"
        isNewVersion
        customFieldDefinitions={customFieldDefinitions}
      />
    </div>
  );
}
