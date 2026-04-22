"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { packageFormSchema, type PackageFormValues } from "@/lib/types/forms";
import { buildCustomFieldInserts } from "@/lib/utils/custom-fields";

export async function createPackage(values: PackageFormValues) {
  const parsed = packageFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid package data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const data = parsed.data;

  const { data: template, error: templateError } = await supabase
    .from("package_templates")
    .insert({ photographer_id: user.id, name: data.name })
    .select()
    .single();

  if (templateError) throw templateError;

  const { data: version, error: versionError } = await supabase
    .from("package_versions")
    .insert({
      package_template_id: template.id,
      photographer_id: user.id,
      version_number: 1,
      version_name: data.version_name,
      base_price: data.base_price,
      currency: data.currency,
      hours_of_coverage: data.hours_of_coverage,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (versionError) throw versionError;

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

  // First version auto-promoted to current
  const { error: updateError } = await supabase
    .from("package_templates")
    .update({ current_version_id: version.id })
    .eq("id", template.id);

  if (updateError) throw updateError;

  revalidatePath("/packages");
  redirect("/packages");
}

/**
 * Creates a new named version of an existing package template.
 * Does NOT auto-promote to current — the user must call setCurrentVersion explicitly.
 * Never modifies existing version rows.
 */
export async function createPackageVersion(
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

  const { data: newVersion, error: versionError } = await supabase
    .from("package_versions")
    .insert({
      package_template_id: templateId,
      photographer_id: user.id,
      version_number: nextVersionNumber,
      version_name: data.version_name,
      base_price: data.base_price,
      currency: data.currency,
      hours_of_coverage: data.hours_of_coverage,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (versionError) throw versionError;

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

  // Only update template name, NOT current_version_id
  const { error: updateError } = await supabase
    .from("package_templates")
    .update({ name: data.name })
    .eq("id", templateId);

  if (updateError) throw updateError;

  revalidatePath("/packages");
  redirect("/packages");
}

/**
 * @deprecated Use createPackageVersion instead. Kept for backwards compatibility.
 */
export async function updatePackage(
  templateId: string,
  values: PackageFormValues
) {
  return createPackageVersion(templateId, values);
}

export async function setCurrentVersion(templateId: string, versionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Validate the version belongs to the template and photographer
  const { data: version, error: versionError } = await supabase
    .from("package_versions")
    .select("id")
    .eq("id", versionId)
    .eq("package_template_id", templateId)
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .single();

  if (versionError || !version) throw new Error("Version not found");

  const { error } = await supabase
    .from("package_templates")
    .update({ current_version_id: versionId })
    .eq("id", templateId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}

export async function toggleVersionArchived(versionId: string, archived: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Can't archive the current version — check first
  if (archived) {
    const { data: template } = await supabase
      .from("package_templates")
      .select("current_version_id")
      .eq("photographer_id", user.id)
      .eq("current_version_id", versionId)
      .maybeSingle();

    if (template) throw new Error("Cannot archive the current version");
  }

  const { error } = await supabase
    .from("package_versions")
    .update({ archived })
    .eq("id", versionId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/packages");
}

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
