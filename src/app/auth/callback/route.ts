import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
