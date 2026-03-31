import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Handles the OAuth callback from Supabase / Google.
 *
 * Uses the request/response cookie pattern (not next/headers) so that
 * session cookies are written directly onto the redirect response.
 * Without this, NextResponse.redirect() creates a new response that
 * doesn't carry the cookies set during exchangeCodeForSession().
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/bookings";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Build the redirect response first so we can attach cookies to it
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write session cookies directly onto the redirect response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Ensure photographer profile exists — handles cases where the
  // handle_new_user trigger didn't fire (e.g. user existed before migration)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("photographers").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  return response;
}
