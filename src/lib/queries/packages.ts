import { createClient } from "@/lib/supabase/server";
import type {
  PackageTemplateWithVersion,
  PackageTemplateForList,
  PackageTemplateForBooking,
  PackageVersion,
  PackageVersionWithBookingCount,
} from "@/lib/types";

export async function getPackageTemplates(): Promise<PackageTemplateForList[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: templates, error } = await supabase
    .from("package_templates")
    .select(
      `*,
      current_version:package_versions!fk_current_version(
        *,
        custom_fields:package_version_custom_fields(
          *,
          definition:custom_field_definitions(label, field_type, description)
        )
      )`
    )
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const templateIds = (templates ?? []).map((t) => t.id);

  let allVersions: (PackageVersion & { bookings: { count: number }[] })[] = [];
  if (templateIds.length > 0) {
    const { data: versions } = await supabase
      .from("package_versions")
      .select("*, bookings(count)")
      .in("package_template_id", templateIds)
      .order("version_number", { ascending: false });
    allVersions = (versions ?? []) as typeof allVersions;
  }

  const versionsByTemplate = new Map<string, PackageVersionWithBookingCount[]>();
  allVersions.forEach((v) => {
    const list = versionsByTemplate.get(v.package_template_id) ?? [];
    list.push({ ...v, booking_count: Number(v.bookings?.[0]?.count ?? 0) });
    versionsByTemplate.set(v.package_template_id, list);
  });

  return (templates ?? []).map((t) => ({
    ...t,
    all_versions: versionsByTemplate.get(t.id) ?? [],
  })) as PackageTemplateForList[];
}

export async function getPackageTemplatesForBooking(): Promise<PackageTemplateForBooking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: templates, error } = await supabase
    .from("package_templates")
    .select(
      `*,
      current_version:package_versions!fk_current_version(*),
      all_versions:package_versions!package_template_id(*)`
    )
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (templates ?? []).map((t: any) => ({
    ...t,
    current_version: t.current_version as PackageVersion | null,
    all_versions: ((t.all_versions ?? []) as PackageVersion[])
      .filter((v) => !v.archived)
      .sort((a, b) => b.version_number - a.version_number),
  })) as PackageTemplateForBooking[];
}

export async function getAllPackageTemplates(): Promise<PackageTemplateForBooking[]> {
  return getPackageTemplatesForBooking();
}

export async function getPackageTemplateById(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [templateResult, versionsResult] = await Promise.all([
    supabase
      .from("package_templates")
      .select("*, current_version:package_versions!fk_current_version(*)")
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

export async function getPackageTemplatesCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("package_templates")
    .select("id", { count: "exact", head: true })
    .eq("photographer_id", user.id)
    .eq("archived", false);

  return count ?? 0;
}
