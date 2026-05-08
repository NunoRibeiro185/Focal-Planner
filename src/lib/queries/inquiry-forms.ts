import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { cache } from "react";
import type { InquiryFormWithFields, PublicFormDefinition } from "@/lib/types/inquiry-forms";

function groupBy<T extends Record<string, unknown>>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = item[key] as string;
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

export async function getInquiryForms(): Promise<InquiryFormWithFields[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: forms } = await db
    .from("inquiry_forms")
    .select("*")
    .eq("photographer_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (!forms || forms.length === 0) return [];

  const formIds = (forms as any[]).map((f) => f.id as string);

  const { data: fields } = await db
    .from("inquiry_form_fields")
    .select("*")
    .in("form_id", formIds)
    .order("sort_order", { ascending: true });

  const fieldIds = ((fields ?? []) as any[]).map((f) => f.id as string);

  const optionsResult = fieldIds.length
    ? await db
        .from("inquiry_form_field_options")
        .select("*")
        .in("field_id", fieldIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const { data: allowedPkgs } = await db
    .from("inquiry_form_allowed_packages")
    .select("form_id, package_template_id")
    .in("form_id", formIds);

  const optionsByField = groupBy((optionsResult.data ?? []) as Record<string, unknown>[], "field_id");
  const fieldsByForm = groupBy(((fields ?? []) as any[]) as Record<string, unknown>[], "form_id");
  const pkgsByForm: Record<string, string[]> = {};
  for (const row of (allowedPkgs ?? []) as any[]) {
    (pkgsByForm[row.form_id] ??= []).push(row.package_template_id);
  }

  return (forms as any[]).map((f) => ({
    id: f.id as string,
    photographer_id: f.photographer_id as string,
    name: f.name as string,
    form_url: f.form_url as string,
    is_active: f.is_active as boolean,
    archived_at: (f.archived_at ?? null) as string | null,
    created_at: f.created_at as string,
    updated_at: f.updated_at as string,
    fields: (fieldsByForm[f.id as string] ?? []).map((field) => ({
      id: field.id as string,
      form_id: field.form_id as string,
      photographer_id: field.photographer_id as string,
      field_type: field.field_type as any,
      label: field.label as string,
      helper_text: (field.helper_text ?? null) as string | null,
      is_required: field.is_required as boolean,
      sort_order: field.sort_order as number,
      field_mapping: (field.field_mapping ?? null) as any,
      options: (optionsByField[field.id as string] ?? []).map((opt) => ({
        id: opt.id as string,
        field_id: opt.field_id as string,
        label: opt.label as string,
        sort_order: opt.sort_order as number,
      })),
    })),
    allowed_package_ids: pkgsByForm[f.id as string] ?? [],
  }));
}

export async function getNonArchivedFormCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("inquiry_forms")
    .select("id", { count: "exact", head: true })
    .eq("photographer_id", user.id)
    .is("archived_at", null);

  return count ?? 0;
}

async function _getPublicFormDefinition(
  photographerSlug: string,
  formUrl: string
): Promise<PublicFormDefinition | null> {
  const supabase = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: photographer } = await db
    .from("photographers")
    .select("id, full_name, slug")
    .eq("slug", photographerSlug)
    .single();

  if (!photographer) return null;

  const { data: form } = await db
    .from("inquiry_forms")
    .select("id, name, form_url")
    .eq("photographer_id", photographer.id)
    .eq("form_url", formUrl)
    .eq("is_active", true)
    .is("archived_at", null)
    .single();

  if (!form) return null;

  const { data: fields } = await db
    .from("inquiry_form_fields")
    .select("*")
    .eq("form_id", form.id)
    .order("sort_order", { ascending: true });

  const fieldIds = ((fields ?? []) as any[]).map((f) => f.id as string);

  const optionsResult = fieldIds.length
    ? await db
        .from("inquiry_form_field_options")
        .select("*")
        .in("field_id", fieldIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const { data: allowedPkgs } = await db
    .from("inquiry_form_allowed_packages")
    .select("package_template_id")
    .eq("form_id", form.id);

  const allowed_package_ids = ((allowedPkgs ?? []) as any[]).map((r) => r.package_template_id as string);
  const optionsByField = groupBy((optionsResult.data ?? []) as Record<string, unknown>[], "field_id");

  const hydratedFields = ((fields ?? []) as any[]).map((f) => ({
    id: f.id as string,
    form_id: f.form_id as string,
    photographer_id: f.photographer_id as string,
    field_type: f.field_type as any,
    label: f.label as string,
    helper_text: (f.helper_text ?? null) as string | null,
    is_required: f.is_required as boolean,
    sort_order: f.sort_order as number,
    field_mapping: (f.field_mapping ?? null) as any,
    options: (optionsByField[f.id as string] ?? []).map((opt) => ({
      id: opt.id as string,
      field_id: opt.field_id as string,
      label: opt.label as string,
      sort_order: opt.sort_order as number,
    })),
  }));

  // Fetch packages — restricted list or all active
  const pkgQuery = db
    .from("package_templates")
    .select("id, name, current_version_id, current_version:package_versions!fk_current_version(id, base_price, currency, description, hours_of_coverage)")
    .eq("photographer_id", photographer.id)
    .eq("archived", false);

  const { data: rawPkgs } = allowed_package_ids.length
    ? await pkgQuery.in("id", allowed_package_ids)
    : await pkgQuery;

  const packages = ((rawPkgs ?? []) as any[])
    .filter((t: any) => t.current_version_id && t.current_version)
    .map((t: any) => ({
      id: t.id as string,
      name: t.name as string,
      base_price: t.current_version.base_price as number,
      currency: t.current_version.currency as string,
      description: (t.current_version.description ?? null) as string | null,
      hours_of_coverage: t.current_version.hours_of_coverage as number,
    }));

  return {
    form: { id: form.id as string, name: form.name as string, form_url: form.form_url as string },
    photographerName: (photographer.full_name ?? "Photographer") as string,
    photographerSlug: photographer.slug as string,
    fields: hydratedFields,
    allowed_package_ids,
    packages,
  };
}

export const getPublicFormDefinition = cache(_getPublicFormDefinition);
