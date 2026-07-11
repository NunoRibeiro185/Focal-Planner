import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { cookies } from "next/headers";
import { cache } from "react";

const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === "true";
const DEV_USER_EMAIL = "nunomonizribeiro@gmail.com";

// URL the *server* uses to reach Supabase. Inside a devcontainer the browser
// hits localhost:54321 (NEXT_PUBLIC_SUPABASE_URL) but the server process must
// reach the host-published port via host.docker.internal — set as
// SUPABASE_INTERNAL_URL. Falls back to the public URL everywhere else.
const SERVER_SUPABASE_URL =
  process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Module-level cache so the admin lookup only hits the network once per server instance
let _devUser: User | null | undefined;

async function fetchDevUser(): Promise<User | null> {
  if (_devUser !== undefined) return _devUser;
  const admin = createSupabaseClient(
    SERVER_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  // Resolve the dev user from the photographers table (service-role bypasses
  // RLS) rather than the GoTrue admin API: the local Supabase stack signs JWTs
  // with an asymmetric key, so the legacy service-role JWT can't call
  // /auth/v1/admin, but PostgREST accepts it. photographers.id == auth.users.id.
  const { data } = await admin
    .from("photographers")
    .select("id, email")
    .eq("email", DEV_USER_EMAIL)
    .maybeSingle();
  _devUser = data
    ? ({
        id: data.id,
        email: data.email ?? DEV_USER_EMAIL,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      } as User)
    : null;
  return _devUser;
}

/**
 * Server-side Supabase client. Memoised per-request via React cache() so all
 * query functions in the same render share one client and one cookie read.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  // In dev-bypass there is no real session, so auth.uid() would be null and RLS
  // (photographer_id = auth.uid()) would return zero rows. Use the service-role
  // key locally so the patched dev user actually sees the seeded data; queries
  // already scope every read by photographer_id. Never enabled in production.
  const supabaseKey = DEV_BYPASS
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createServerClient<Database>(
    SERVER_SUPABASE_URL,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies cannot be set.
            // Ignored: the middleware will refresh the session.
          }
        },
      },
    }
  );

  if (DEV_BYPASS) {
    const devUser = await fetchDevUser();
    if (devUser) {
      // Patch auth.getUser so all callers (layouts, server actions, queries) get the dev user
      client.auth.getUser = async () => ({ data: { user: devUser }, error: null });
    }
  }

  return client;
});

/** Cached auth lookup — resolves once per request regardless of call count. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
