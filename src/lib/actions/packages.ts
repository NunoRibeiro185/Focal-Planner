"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { packageFormSchema, type PackageFormValues } from "@/lib/types/forms";
import { buildCustomFieldInserts } from "@/lib/utils/custom-fields";

/**
 * Creates a new package template and its first version atomically.
 * The template's current_version_id is updated to point at the new version.
 */
export async function createPackage(values: PackageFormValues) {
  const parsed = packageFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid package data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const data = parsed.data;

  // 1. Insert template (no current_version_id yet)
  const { data: template, error: templateError } = await supabase
    .from("package_templates")
    .insert({ photographer_id: user.id, name: data.name })
    .select()
    .single();

  if (templateError) throw templateError;

  // 2. Insert first version
  const { data: version, error: versionError } = await supabase
    .from("package_versions")
    .insert({
      package_template_id: template.id,
      photographer_id: user.id,
      version_number: 1,
      base_price: data.base_price,
      currency: data.currency,
      hours_of_coverage: data.hours_of_coverage,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // 3. Snapshot custom field values
  const customFieldRows = buildCustomFieldInserts(
    version.id,
    user.id,
    data.custom_fields ?? []
  );
  if (customFieldRows.length > 0) {
    const { error: cfError } = await supabase
      .from("package_version_custom_fields")
      .insert(customFieldRows);
    if (cfError) throw cfError;
  }

  // 4. Point template at the new version
  const { error: updateError } = await supabase
    .from("package_templates")
    .update({ current_version_id: version.id })
    .eq("id", template.id);

  if (updateError) throw updateError;

  revalidatePath("/packages");
  redirect("/packages");
}

/**
 * Saves a new version of an existing package template.
 * Never modifies existing version rows — creates a new one and updates
 * current_version_id. Existing bookings reference their original version
 * and are completely unaffected.
 */
export async function updatePackage(
  templateId: string,
  values: PackageFormValues
) {
  const parsed = packageFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid package data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const data = parsed.data;

  // Verify ownership and get latest version number
  const { data: template, error: templateError } = await supabase
    .from("package_templates")
    .select("id, photographer_id")
    .eq("id", templateId)
    .eq("photographer_id", user.id)
    .single();

  if (templateError || !template) throw new Error("Package not found");

  const { data: latestVersion, error: latestError } = await supabase
    .from("package_versions")
    .select("version_number")
    .eq("package_template_id", templateId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  if (latestError) throw latestError;

  const nextVersionNumber = latestVersion.version_number + 1;

  // Insert new version (immutable snapshot)
  const { data: newVersion, error: versionError } = await supabase
    .from("package_versions")
    .insert({
      package_template_id: templateId,
      photographer_id: user.id,
      version_number: nextVersionNumber,
      base_price: data.base_price,
      currency: data.currency,
      hours_of_coverage: data.hours_of_coverage,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // Snapshot custom field values for the new version
  const customFieldRows = buildCustomFieldInserts(
    newVersion.id,
    user.id,
    data.custom_fields ?? []
  );
  if (customFieldRows.length > 0) {
    const { error: cfError } = await supabase
      .from("package_version_custom_fields")
      .insert(customFieldRows);
    if (cfError) throw cfError;
  }

  // Update template name + current_version_id atomically
  const { error: updateError } = await supabase
    .from("package_templates")
    .update({ name: data.name, current_version_id: newVersion.id })
    .eq("id", templateId);

  if (updateError) throw updateError;

  revalidatePath("/packages");
  redirect("/packages");
}

/**
 * Toggles the archived state of a package template.
 */
export async function togglePackageArchived(
  templateId: string,
  archived: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("package_templates")
    .update({ archived })
    .eq("id", templateId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}
