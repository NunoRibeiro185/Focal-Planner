import { NextResponse } from "next/server";
import { connectGoogleCalendar } from "@/lib/actions/google-calendar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?google=error`);
  }

  try {
    await connectGoogleCalendar(code, state);
    return NextResponse.redirect(`${origin}/settings?google=connected`);
  } catch (e) {
    console.error("[GoogleCalendar] OAuth callback error:", e);
    return NextResponse.redirect(`${origin}/settings?google=error`);
  }
}
