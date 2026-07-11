import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { cache } from "react";
import type { InquiryFormWithFields, PublicFormDefinition } from "@/lib/types/inquiry-forms";

function groupBy<T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key]);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

export async function getInquiryForms(): Promise<InquiryFormWithFields[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: forms } = await supabase
    .from("inquiry_forms")
    .select("*")
    .eq("photographer_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (!forms || forms.length === 0) return [];

  const formIds = forms.map((f) => f.id);

  const { data: fields } = await supabase
    .from("inquiry_form_fields")
    .select("*")
    .in("form_id", formIds)
    .order("sort_order", { ascending: true });

  const fieldIds = (fields ?? []).map((f) => f.id);

  const optionsResult = fieldIds.length
    ? await supabase
        .from("inquiry_form_field_options")
        .select("*")
        .in("field_id", fieldIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const { data: allowedPkgs } = await supabase
    .from("inquiry_form_allowed_packages")
    .select("form_id, package_template_id")
    .in("form_id", formIds);

  const optionsByField = groupBy(optionsResult.data ?? [], "field_id");
  const fieldsByForm = groupBy(fields ?? [], "form_id");
  const pkgsByForm: Record<string, string[]> = {};
  for (const row of allowedPkgs ?? []) {
    (pkgsByForm[row.form_id] ??= []).push(row.package_template_id);
  }

  return forms.map((f) => ({
    id: f.id,
    photographer_id: f.photographer_id,
    name: f.name,
    form_url: f.form_url,
    is_active: f.is_active,
    archived_at: f.archived_at,
    created_at: f.created_at,
    updated_at: f.updated_at,
    fields: (fieldsByForm[f.id] ?? []).map((field) => ({
      id: field.id,
      form_id: field.form_id,
      photographer_id: field.photographer_id,
      field_type: field.field_type,
      label: field.label,
      helper_text: field.helper_text,
      is_required: field.is_required,
      sort_order: field.sort_order,
      field_mapping: field.field_mapping,
      options: (optionsByField[field.id] ?? []).map((opt) => ({
        id: opt.id,
        field_id: opt.field_id,
        label: opt.label,
        sort_order: opt.sort_order,
      })),
    })),
    allowed_package_ids: pkgsByForm[f.id] ?? [],
  }));
}

export async function getNonArchivedFormCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
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

  const { data: photographer } = await supabase
    .from("photographers")
    .select("id, full_name, slug")
    .eq("slug", photographerSlug)
    .single();

  if (!photographer) return null;

  const { data: form } = await supabase
    .from("inquiry_forms")
    .select("id, name, form_url")
    .eq("photographer_id", photographer.id)
    .eq("form_url", formUrl)
    .eq("is_active", true)
    .is("archived_at", null)
    .single();

  if (!form) return null;

  const { data: fields } = await supabase
    .from("inquiry_form_fields")
    .select("*")
    .eq("form_id", form.id)
    .order("sort_order", { ascending: true });

  const fieldIds = (fields ?? []).map((f) => f.id);

  const optionsResult = fieldIds.length
    ? await supabase
        .from("inquiry_form_field_options")
        .select("*")
        .in("field_id", fieldIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const { data: allowedPkgs } = await supabase
    .from("inquiry_form_allowed_packages")
    .select("package_template_id")
    .eq("form_id", form.id);

  const allowed_package_ids = (allowedPkgs ?? []).map((r) => r.package_template_id);
  const optionsByField = groupBy(optionsResult.data ?? [], "field_id");

  const hydratedFields = (fields ?? []).map((f) => ({
    id: f.id,
    form_id: f.form_id,
    photographer_id: f.photographer_id,
    field_type: f.field_type,
    label: f.label,
    helper_text: f.helper_text,
    is_required: f.is_required,
    sort_order: f.sort_order,
    field_mapping: f.field_mapping,
    options: (optionsByField[f.id] ?? []).map((opt) => ({
      id: opt.id,
      field_id: opt.field_id,
      label: opt.label,
      sort_order: opt.sort_order,
    })),
  }));

  // Fetch packages — restricted list or all active
  const pkgQuery = supabase
    .from("package_templates")
    .select("id, name, current_version_id, current_version:package_versions!fk_current_version(id, base_price, currency, description, hours_of_coverage)")
    .eq("photographer_id", photographer.id)
    .eq("archived", false);

  const { data: rawPkgs } = allowed_package_ids.length
    ? await pkgQuery.in("id", allowed_package_ids)
    : await pkgQuery;

  const packages = (rawPkgs ?? []).flatMap((t) => {
    const v = t.current_version;
    if (!t.current_version_id || !v) return [];
    return [{
      id: t.id,
      name: t.name,
      base_price: v.base_price,
      currency: v.currency,
      description: v.description,
      hours_of_coverage: v.hours_of_coverage,
    }];
  });

  return {
    form: { id: form.id, name: form.name, form_url: form.form_url },
    photographerName: photographer.full_name ?? "Photographer",
    photographerSlug: photographer.slug ?? photographerSlug,
    fields: hydratedFields,
    allowed_package_ids,
    packages,
  };
}

export const getPublicFormDefinition = cache(_getPublicFormDefinition);
