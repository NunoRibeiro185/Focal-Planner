import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

// Module-level cache so the admin lookup only hits the network once per server instance
let _devUser: User | null | undefined;

async function fetchDevUser(): Promise<User | null> {
  if (_devUser !== undefined) return _devUser;
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  _devUser = data.users.find((u) => u.email === "nunomonizribeiro@gmail.com") ?? null;
  return _devUser;
}

/**
 * Server-side Supabase client. Memoised per-request via React cache() so all
 * query functions in the same render share one client and one cookie read.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  if (process.env.DEV_BYPASS_AUTH === "true") {
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
