import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/services/lemonsqueezy";
import type { SubscriptionPlan } from "@/lib/types/database";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let plan: SubscriptionPlan;
  try {
    const body = await req.json();
    if (body.plan !== "monthly" && body.plan !== "annual") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    plan = body.plan;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const redirectUrl = `${origin}/settings?checkout=success`;
    const url = await createCheckoutSession(user.id, user.email ?? "", plan, redirectUrl);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Checkout session creation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
