"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getNonArchivedFormCount } from "@/lib/queries/inquiry-forms";
import { getEffectiveTier, hasReachedLimit } from "@/lib/services/entitlements";
import { normalizeFormUrl } from "@/lib/utils/inquiry-forms";
import { z } from "zod";

const fieldOptionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  sort_order: z.number().int(),
});

const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  field_type: z.enum(["short_text", "long_text", "single_choice", "multiple_choice", "number", "date"]),
  label: z.string().min(1),
  helper_text: z.string().nullable(),
  is_required: z.boolean(),
  sort_order: z.number().int(),
  field_mapping: z.string().nullable(),
  options: z.array(fieldOptionSchema),
});

const saveFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  form_url: z.string().min(1),
  is_active: z.boolean(),
  fields: z.array(fieldSchema),
  allowed_package_ids: z.array(z.string().uuid()),
});

type ActionResult = { success: boolean; error?: string; id?: string };

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveInquiryForm(raw: unknown): Promise<ActionResult> {
  const parsed = saveFormSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid form data." };

  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, error: "Not authenticated." };

  const data = parsed.data;
  const normalizedFormUrl = normalizeFormUrl(data.form_url);
  const isNew = !data.id;

  if (isNew) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("photographer_id", user.id)
      .maybeSingle();
    const tier = getEffectiveTier(sub);
    const count = await getNonArchivedFormCount();
    if (hasReachedLimit(tier, "inquiryFormsTotal", count)) {
      return { success: false, error: "You have reached the form limit for your plan. Upgrade to create more forms." };
    }
  }

  const formPayload = {
    photographer_id: user.id,
    name: data.name,
    form_url: normalizedFormUrl,
    is_active: data.is_active,
    updated_at: new Date().toISOString(),
  };

  let formId: string;
  if (isNew) {
    const { data: inserted, error } = await supabase
      .from("inquiry_forms")
      .insert(formPayload)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "This URL is already in use." };
      console.error("saveInquiryForm insert error:", error);
      return { success: false, error: "Failed to save form." };
    }
    formId = inserted.id;
  } else {
    const { error } = await supabase
      .from("inquiry_forms")
      .update(formPayload)
      .eq("id", data.id!)
      .eq("photographer_id", user.id);
    if (error) {
      if (error.code === "23505") return { success: false, error: "This URL is already in use." };
      return { success: false, error: "Failed to save form." };
    }
    formId = data.id!;
  }

  // Replace all fields (delete + re-insert)
  await supabase.from("inquiry_form_fields").delete().eq("form_id", formId);

  for (const field of data.fields) {
    const { data: insertedField, error: fieldError } = await supabase
      .from("inquiry_form_fields")
      .insert({
        form_id: formId,
        photographer_id: user.id,
        field_type: field.field_type,
        label: field.label,
        helper_text: field.helper_text,
        is_required: field.is_required,
        sort_order: field.sort_order,
        field_mapping: field.field_mapping,
      })
      .select("id")
      .single();

    if (fieldError || !insertedField) continue;

    if (field.options.length > 0) {
      await supabase.from("inquiry_form_field_options").insert(
        field.options.map((opt) => ({
          field_id: insertedField.id,
          label: opt.label,
          sort_order: opt.sort_order,
        }))
      );
    }
  }

  // Replace allowed packages
  await supabase.from("inquiry_form_allowed_packages").delete().eq("form_id", formId);
  if (data.allowed_package_ids.length > 0) {
    await supabase.from("inquiry_form_allowed_packages").insert(
      data.allowed_package_ids.map((pkg_id) => ({
        form_id: formId,
        package_template_id: pkg_id,
      }))
    );
  }

  revalidatePath("/inquiries");
  return { success: true, id: formId };
}

export async function toggleInquiryFormActive(formId: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("inquiry_forms")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", formId)
    .eq("photographer_id", user.id);

  if (error) return { success: false, error: "Failed to update form." };
  revalidatePath("/inquiries");
  return { success: true };
}

export async function archiveInquiryForm(formId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("inquiry_forms")
    .update({ archived_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
    .eq("id", formId)
    .eq("photographer_id", user.id);

  if (error) return { success: false, error: "Failed to archive form." };
  revalidatePath("/inquiries");
  return { success: true };
}

export async function getFormsUsingPackage(packageTemplateId: string): Promise<string[]> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return [];

  const { data } = await supabase
    .from("inquiry_form_allowed_packages")
    .select("form_id, form:inquiry_forms(name, archived_at)")
    .eq("package_template_id", packageTemplateId);

  return (data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r) => (r.form as any)?.archived_at === null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r) => (r.form as any)?.name ?? r.form_id);
}

export async function removePackageFromAllForms(packageTemplateId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return;

  const { data: ownedForms } = await supabase
    .from("inquiry_forms")
    .select("id")
    .eq("photographer_id", user.id);

  const ownedFormIds = (ownedForms ?? []).map((f) => f.id);
  if (ownedFormIds.length === 0) return;

  await supabase
    .from("inquiry_form_allowed_packages")
    .delete()
    .eq("package_template_id", packageTemplateId)
    .in("form_id", ownedFormIds);

  revalidatePath("/inquiries");
}
