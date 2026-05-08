"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { settingsSchema, slugSchema, type SettingsValues } from "@/lib/types/forms";

export async function updateSettings(values: SettingsValues): Promise<{ success: boolean; error?: string }> {
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: "Invalid settings data." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const update: Record<string, unknown> = {
    full_name: parsed.data.full_name,
    default_currency: parsed.data.default_currency,
  };

  if (parsed.data.slug) {
    update.slug = parsed.data.slug;
  }

  const { error } = await supabase
    .from("photographers")
    .update(update)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { success: false, error: "That URL is already taken. Please choose another." };
    return { success: false, error: "Failed to save settings." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function checkPhotographerSlug(slug: string): Promise<{ available: boolean }> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success || !slug) return { available: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { available: false };

  const { data } = await supabase
    .from("photographers")
    .select("id")
    .eq("slug", slug)
    .neq("id", user.id)
    .maybeSingle();

  return { available: data === null };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;

  await supabase.auth.signOut();
  redirect("/login");
}
