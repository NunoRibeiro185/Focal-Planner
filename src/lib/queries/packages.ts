import { createClient } from "@/lib/supabase/server";
import type { PackageTemplateWithVersion, PackageTemplateWithVersionAndCustomFields } from "@/lib/types";

export async function getPackageTemplates(): Promise<PackageTemplateWithVersionAndCustomFields[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as PackageTemplateWithVersionAndCustomFields[];
}

export async function getAllPackageTemplates(): Promise<PackageTemplateWithVersion[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("package_templates")
    .select(
      `
      *,
      current_version:package_versions!fk_current_version(*)
      `
    )
    .eq("photographer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as PackageTemplateWithVersion[];
}

export async function getPackageTemplateById(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
      .eq("photographer_id", user.id)
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
