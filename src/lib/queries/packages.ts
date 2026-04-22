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
          definition:custom_field_definitions(label, field_type)
        )
      )`
    )
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const templateIds = (templates ?? []).map((t) => t.id);

  let allVersions: PackageVersion[] = [];
  if (templateIds.length > 0) {
    const { data: versions } = await supabase
      .from("package_versions")
      .select("*")
      .in("package_template_id", templateIds)
      .order("version_number", { ascending: false });
    allVersions = (versions ?? []) as PackageVersion[];
  }

  const bookingCountMap = new Map<string, number>();
  if (allVersions.length > 0) {
    const versionIds = allVersions.map((v) => v.id);
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("package_version_id")
      .in("package_version_id", versionIds);
    (bookingRows ?? []).forEach((b: any) => {
      const id = b.package_version_id;
      bookingCountMap.set(id, (bookingCountMap.get(id) ?? 0) + 1);
    });
  }

  const versionsByTemplate = new Map<string, PackageVersionWithBookingCount[]>();
  allVersions.forEach((v) => {
    const list = versionsByTemplate.get(v.package_template_id) ?? [];
    list.push({ ...v, booking_count: bookingCountMap.get(v.id) ?? 0 });
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
    .select("*, current_version:package_versions!fk_current_version(*)")
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const templateIds = (templates ?? []).map((t) => t.id);

  let allVersions: PackageVersion[] = [];
  if (templateIds.length > 0) {
    const { data: versions } = await supabase
      .from("package_versions")
      .select("*")
      .in("package_template_id", templateIds)
      .eq("archived", false)
      .order("version_number", { ascending: false });
    allVersions = (versions ?? []) as PackageVersion[];
  }

  const versionsByTemplate = new Map<string, PackageVersion[]>();
  allVersions.forEach((v) => {
    const list = versionsByTemplate.get(v.package_template_id) ?? [];
    list.push(v);
    versionsByTemplate.set(v.package_template_id, list);
  });

  return (templates ?? []).map((t) => ({
    ...t,
    current_version: (t as any).current_version as PackageVersion | null,
    all_versions: versionsByTemplate.get(t.id) ?? [],
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
