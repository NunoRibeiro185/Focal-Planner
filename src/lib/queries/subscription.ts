import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Subscription } from "@/lib/types/database";

export async function getSubscription(
  supabase: SupabaseClient<Database>,
  photographerId: string
): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("photographer_id", photographerId)
    .maybeSingle();

  return data ?? null;
}
