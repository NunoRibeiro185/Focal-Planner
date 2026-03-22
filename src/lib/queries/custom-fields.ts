import { createClient } from "@/lib/supabase/server";
import type { CustomFieldDefinition, PackageVersionCustomField } from "@/lib/types";

/**
 * Returns all active (non-deleted) custom field definitions for the current
 * photographer, ordered by creation time.
 */
export async function getCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as CustomFieldDefinition[];
}

/**
 * Returns all custom field values snapshotted for a specific package version.
 */
export async function getCustomFieldsForVersion(
  packageVersionId: string
): Promise<PackageVersionCustomField[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("package_version_custom_fields")
    .select("*")
    .eq("package_version_id", packageVersionId);

  if (error) throw error;

  return (data ?? []) as PackageVersionCustomField[];
}
