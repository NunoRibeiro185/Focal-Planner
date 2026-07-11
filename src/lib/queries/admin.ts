import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface AdminPhotographer {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription: {
    status: string;
    plan: string;
    current_period_end: string;
    admin_granted: boolean;
  } | null;
}

export async function getAllPhotographers(): Promise<AdminPhotographer[]> {
  const supabase = createServiceRoleClient();

  const [{ data: photographers }, { data: subsRaw }] = await Promise.all([
    supabase
      .from("photographers")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("photographer_id, status, plan, current_period_end, lemon_squeezy_subscription_id"),
  ]);

  const subscriptions = subsRaw ?? [];

  const subMap = new Map(subscriptions.map((s) => [s.photographer_id, s]));

  return (photographers ?? []).map((p) => {
    const sub = subMap.get(p.id) ?? null;
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      subscription: sub
        ? {
            status: sub.status,
            plan: sub.plan,
            current_period_end: sub.current_period_end,
            admin_granted: sub.lemon_squeezy_subscription_id.startsWith("admin_grant_"),
          }
        : null,
    };
  });
}
