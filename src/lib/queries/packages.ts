import { createClient } from "@/lib/supabase/server";
import type {
  PackageTemplateWithVersion,
  PackageTemplateForList,
  PackageTemplateForBooking,
  PackageVersion,
  PackageVersionWithBookingCount,
} from "@/lib/types";
import type { PackageTemplateWithServices } from "@/lib/types/services";

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
      ),
      services:package_template_services(default_quantity, service:services(unit_price))`
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

  const [templateResult, versionsResult, servicesResult] = await Promise.all([
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
    supabase
      .from("package_template_services")
      .select("service_id, default_quantity, sort_order")
      .eq("package_template_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (templateResult.error) throw templateResult.error;
  if (versionsResult.error) throw versionsResult.error;

  return {
    template: templateResult.data as PackageTemplateWithVersion,
    versions: versionsResult.data ?? [],
    existingServices: (servicesResult.data ?? []) as Array<{ service_id: string; default_quantity: number; sort_order: number }>,
  };
}

export async function getPackageTemplatesWithServices(): Promise<PackageTemplateWithServices[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("package_templates")
    .select(`
      id, photographer_id, name, archived, created_at,
      current_version:package_versions!fk_current_version(base_price, currency),
      services:package_template_services(
        service_id, default_quantity, sort_order,
        service:services(id, name, description, unit_price, track_completion)
      )
    `)
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row: any) => ({
    ...row,
    base_price: row.current_version?.base_price ?? null,
    currency: row.current_version?.currency ?? null,
  })) as unknown as PackageTemplateWithServices[];
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
