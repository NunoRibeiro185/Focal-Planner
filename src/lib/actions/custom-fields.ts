"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  customFieldDefinitionSchema,
  type CustomFieldDefinitionValues,
} from "@/lib/types/forms";

export async function createCustomField(values: CustomFieldDefinitionValues) {
  const parsed = customFieldDefinitionSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid custom field data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert({
      photographer_id: user.id,
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      field_type: "checkbox",
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/packages");

  return data;
}

export async function updateCustomField(
  fieldId: string,
  values: { label: string; description: string | null }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("custom_field_definitions")
    .update({ label: values.label, description: values.description })
    .eq("id", fieldId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/packages");
}

export async function softDeleteCustomField(fieldId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("custom_field_definitions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fieldId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/packages");
}
