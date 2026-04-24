import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Photographer } from "@/lib/types/database";

/** Photographer's inquiry form settings (slug + visibility toggles). */
export async function getInquirySettings(): Promise<Pick<
  Photographer,
  | "slug"
  | "inquiry_form_enabled"
  | "inquiry_show_packages"
  | "inquiry_show_prices"
  | "inquiry_show_phone"
  | "inquiry_show_secondary_name"
  | "inquiry_show_event_date"
  | "inquiry_show_venue"
  | "inquiry_show_location"
  | "inquiry_show_notes"
> | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("photographers")
    .select(
      "slug, inquiry_form_enabled, inquiry_show_packages, inquiry_show_prices, inquiry_show_phone, inquiry_show_secondary_name, inquiry_show_event_date, inquiry_show_venue, inquiry_show_location, inquiry_show_notes"
    )
    .eq("id", user.id)
    .single();

  return data ?? null;
}

export interface PackageForInquiry {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  description: string | null;
  hours_of_coverage: number;
  custom_fields: Array<{
    id: string;
    label: string;
    field_type: string;
    value_bool: boolean | null;
    value_text: string | null;
  }>;
}

export interface PublicInquiryFormData {
  photographer: Pick<Photographer, "full_name" | "slug" | "inquiry_show_packages" | "inquiry_show_prices" | "inquiry_show_phone" | "inquiry_show_secondary_name" | "inquiry_show_event_date" | "inquiry_show_venue" | "inquiry_show_location" | "inquiry_show_notes">;
  packages: PackageForInquiry[];
}

/**
 * Fetches the data needed to render the public inquiry form.
 * Uses the service-role client since the visitor is unauthenticated.
 * Returns null when the slug doesn't exist or the form is disabled.
 */
async function _getPublicInquiryFormData(
  slug: string
): Promise<PublicInquiryFormData | null> {
  const supabase = createServiceRoleClient();

  // Round-trip 1: photographer + non-archived templates + their current versions.
  // Custom fields are fetched separately — triple-nested joins fail in PostgREST.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw, error: rawError } = await (supabase as any)
    .from("photographers")
    .select(
      `id, full_name, slug, inquiry_form_enabled,
       inquiry_show_packages, inquiry_show_prices,
       inquiry_show_phone, inquiry_show_secondary_name,
       inquiry_show_event_date, inquiry_show_venue,
       inquiry_show_location, inquiry_show_notes,
       package_templates!package_templates_photographer_id_fkey(
         id, name, current_version_id,
         current_version:package_versions!fk_current_version(
           id, base_price, currency, description, hours_of_coverage
         )
       )`
    )
    .eq("slug", slug)
    .eq("package_templates.archived", false)
    .single() as { data: any | null; error: any | null };

  if (rawError) {
    console.error("[inquiry] photographer query error:", JSON.stringify(rawError));
  }

  if (!raw || !raw.inquiry_form_enabled) {
    console.error("[inquiry] null or disabled:", JSON.stringify({ slug: raw?.slug ?? null, enabled: raw?.inquiry_form_enabled ?? null }));
    return null;
  }

  const { package_templates: rawTemplates, ...photographerFields } = raw;

  const validTemplates = ((rawTemplates ?? []) as any[]).filter(
    (t) => t.current_version_id !== null && t.current_version !== null
  );

  // Round-trip 2: custom fields for all current version IDs.
  const versionIds = validTemplates.map((t) => t.current_version.id as string);
  const customFieldsByVersion: Record<string, any[]> = {};

  if (versionIds.length > 0) {
    const { data: cfRows } = await (supabase as any)
      .from("package_version_custom_fields")
      .select("id, package_version_id, value_bool, value_text, definition:custom_field_definitions(label, field_type)")
      .in("package_version_id", versionIds) as { data: any[] | null };

    for (const cf of cfRows ?? []) {
      (customFieldsByVersion[cf.package_version_id] ??= []).push(cf);
    }
  }

  const packages: PackageForInquiry[] = validTemplates.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    base_price: (t.current_version.base_price ?? 0) as number,
    currency: (t.current_version.currency ?? "EUR") as string,
    description: (t.current_version.description ?? null) as string | null,
    hours_of_coverage: (t.current_version.hours_of_coverage ?? 0) as number,
    custom_fields: (customFieldsByVersion[t.current_version.id] ?? []).map((cf) => ({
      id: cf.id as string,
      label: (cf.definition?.label ?? "") as string,
      field_type: (cf.definition?.field_type ?? "text") as string,
      value_bool: (cf.value_bool ?? null) as boolean | null,
      value_text: (cf.value_text ?? null) as string | null,
    })),
  }));

  return { photographer: photographerFields, packages };
}

export const getPublicInquiryFormData = cache(_getPublicInquiryFormData);
