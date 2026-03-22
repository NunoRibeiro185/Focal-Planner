"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { settingsSchema, type SettingsValues } from "@/lib/types/forms";

export async function updateSettings(values: SettingsValues) {
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid settings data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("photographers")
    .update({
      full_name: parsed.data.full_name,
      default_currency: parsed.data.default_currency,
    })
    .eq("id", user.id);

  if (error) throw error;

  revalidatePath("/settings");
}
