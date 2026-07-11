import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * ONLY use in server actions where the caller is unauthenticated
 * (e.g. the public inquiry form submission).
 *
 * Never import this in client components or expose the key to the browser.
 */
export function createServiceRoleClient() {
  // Prefer the in-container URL (host.docker.internal) when set; see server.ts.
  const url =
    process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
