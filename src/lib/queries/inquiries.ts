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

export interface PublicInquiryFormData {
  photographer: Pick<Photographer, "full_name" | "slug" | "inquiry_show_packages" | "inquiry_show_prices" | "inquiry_show_phone" | "inquiry_show_secondary_name" | "inquiry_show_event_date" | "inquiry_show_venue" | "inquiry_show_location" | "inquiry_show_notes">;
  packages: Array<{ id: string; name: string; base_price: number; currency: string; description: string | null }>;
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

  // Single round-trip: photographer + non-archived templates + their current versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from("photographers")
    .select(
      `id, full_name, slug, inquiry_form_enabled,
       inquiry_show_packages, inquiry_show_prices,
       inquiry_show_phone, inquiry_show_secondary_name,
       inquiry_show_event_date, inquiry_show_venue,
       inquiry_show_location, inquiry_show_notes,
       package_templates!package_templates_photographer_id_fkey(
         id, name, current_version_id,
         current_version:package_versions!package_templates_current_version_id_fkey(
           id, base_price, currency, description
         )
       )`
    )
    .eq("slug", slug)
    .eq("package_templates.archived", false)
    .single() as { data: any | null };

  if (!raw || !raw.inquiry_form_enabled) return null;

  const { package_templates: rawTemplates, ...photographerFields } = raw;

  const packages = ((rawTemplates ?? []) as any[])
    .filter((t) => t.current_version_id !== null && t.current_version !== null)
    .map((t) => ({
      id: t.id as string,
      name: t.name as string,
      base_price: (t.current_version?.base_price ?? 0) as number,
      currency: (t.current_version?.currency ?? "EUR") as string,
      description: (t.current_version?.description ?? null) as string | null,
    }));

  return { photographer: photographerFields, packages };
}

export const getPublicInquiryFormData = cache(_getPublicInquiryFormData);
