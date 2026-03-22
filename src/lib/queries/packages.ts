import { createClient } from "@/lib/supabase/server";
import type { PackageTemplateWithVersion, PackageTemplateWithVersionAndCustomFields } from "@/lib/types";

/**
 * Returns all non-archived package templates for the current user,
 * each joined with its current version row and any snapshotted custom field
 * values (with their definition labels for display).
 */
export async function getPackageTemplates(): Promise<PackageTemplateWithVersionAndCustomFields[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("package_templates")
    .select(
      `
      *,
      current_version:package_versions!fk_current_version(
        *,
        custom_fields:package_version_custom_fields(
          *,
          definition:custom_field_definitions(label, field_type)
        )
      )
      `
    )
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as PackageTemplateWithVersionAndCustomFields[];
}

/**
 * Returns all package templates (including archived) with their current version.
 */
export async function getAllPackageTemplates(): Promise<PackageTemplateWithVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("package_templates")
    .select(
      `
      *,
      current_version:package_versions!fk_current_version(*)
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as PackageTemplateWithVersion[];
}

/**
 * Returns a single package template with its full version history.
 */
export async function getPackageTemplateById(id: string) {
  const supabase = await createClient();

  const [templateResult, versionsResult] = await Promise.all([
    supabase
      .from("package_templates")
      .select(
        `
        *,
        current_version:package_versions!fk_current_version(*)
        `
      )
      .eq("id", id)
      .single(),
    supabase
      .from("package_versions")
      .select("*")
      .eq("package_template_id", id)
      .order("version_number", { ascending: false }),
  ]);

  if (templateResult.error) throw templateResult.error;
  if (versionsResult.error) throw versionsResult.error;

  return {
    template: templateResult.data as PackageTemplateWithVersion,
    versions: versionsResult.data ?? [],
  };
}
