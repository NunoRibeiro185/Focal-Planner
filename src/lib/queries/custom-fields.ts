import { createClient } from "@/lib/supabase/server";
import type { CustomFieldDefinition, PackageVersionCustomField } from "@/lib/types";

export async function getCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("photographer_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as CustomFieldDefinition[];
}

export async function getCustomFieldsForVersion(
  packageVersionId: string
): Promise<PackageVersionCustomField[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("package_version_custom_fields")
    .select("*")
    .eq("photographer_id", user.id)
    .eq("package_version_id", packageVersionId);

  if (error) throw error;

  return (data ?? []) as PackageVersionCustomField[];
}
