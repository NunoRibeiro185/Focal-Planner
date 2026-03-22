import { createBrowserClient } from "@supabase/ssr";

// We use the untyped client here because full Supabase type generation
// requires a running Supabase instance (`supabase gen types typescript`).
// Row types are imported directly from @/lib/types for all query return values.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
