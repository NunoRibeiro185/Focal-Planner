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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: photographers }, { data: subsRaw }] = await Promise.all([
    supabase
      .from("photographers")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("subscriptions") as any).select(
      "photographer_id, status, plan, current_period_end, lemon_squeezy_subscription_id"
    ),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptions = (subsRaw ?? []) as any[];

  const subMap = new Map<string, (typeof subscriptions)[number]>(
    subscriptions.map((s) => [s.photographer_id as string, s])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((photographers ?? []) as any[]).map((p) => {
    const sub = subMap.get(p.id as string) ?? null;
    return {
      id: p.id as string,
      email: p.email as string,
      full_name: (p.full_name ?? null) as string | null,
      created_at: p.created_at as string,
      subscription: sub
        ? {
            status: sub.status as string,
            plan: sub.plan as string,
            current_period_end: sub.current_period_end as string,
            admin_granted: (sub.lemon_squeezy_subscription_id as string).startsWith("admin_grant_"),
          }
        : null,
    };
  });
}
