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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: photographerRaw } = await (supabase as any)
    .from("photographers")
    .select(
      "id, full_name, slug, inquiry_form_enabled, inquiry_show_packages, inquiry_show_prices, inquiry_show_phone, inquiry_show_secondary_name, inquiry_show_event_date, inquiry_show_venue, inquiry_show_location, inquiry_show_notes"
    )
    .eq("slug", slug)
    .single() as { data: (Pick<Photographer, "full_name" | "slug" | "inquiry_form_enabled" | "inquiry_show_packages" | "inquiry_show_prices" | "inquiry_show_phone" | "inquiry_show_secondary_name" | "inquiry_show_event_date" | "inquiry_show_venue" | "inquiry_show_location" | "inquiry_show_notes"> & { id: string }) | null };

  if (!photographerRaw || !photographerRaw.inquiry_form_enabled) return null;
  const photographer = photographerRaw;

  const { data: templates } = await supabase
    .from("package_templates")
    .select("id, name, current_version_id")
    .eq("photographer_id", photographer.id)
    .eq("archived", false)
    .not("current_version_id", "is", null);

  const versionIds = (templates ?? [])
    .map((t: any) => t.current_version_id as string)
    .filter(Boolean);

  const { data: versions } = versionIds.length > 0
    ? await supabase
        .from("package_versions")
        .select("id, base_price, currency, description")
        .in("id", versionIds)
    : { data: [] as { id: string; base_price: number; currency: string; description: string | null }[] };

  const versionMap = new Map(
    (versions ?? []).map((v: any) => [v.id, v])
  );

  const packages = (templates ?? []).map((t: any) => {
    const version = versionMap.get(t.current_version_id) as any;
    return {
      id: t.id as string,
      name: t.name as string,
      base_price: (version?.base_price ?? 0) as number,
      currency: (version?.currency ?? "EUR") as string,
      description: (version?.description ?? null) as string | null,
    };
  });

  return { photographer, packages };
}

export const getPublicInquiryFormData = cache(_getPublicInquiryFormData);
