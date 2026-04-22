import { createClient } from "@/lib/supabase/server";
import type { AnalyticsBooking } from "@/lib/utils/analytics";

export async function getPriorYearRevenue(year: number): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("bookings")
    .select("total_price")
    .eq("photographer_id", user.id)
    .gte("event_date", `${year}-01-01`)
    .lte("event_date", `${year}-12-31`)
    .not("status", "in", "(inquiry,cancelled)");

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
}

export async function getBookingYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("bookings")
    .select("event_date")
    .eq("photographer_id", user.id);

  if (error) throw error;

  const years = [
    ...new Set(
      (data ?? [])
        .filter((b) => b.event_date != null)
        .map((b) => new Date(b.event_date!).getFullYear())
    ),
  ].sort((a, b) => b - a);

  return years;
}

export async function getAnalyticsBookings(
  year: number
): Promise<AnalyticsBooking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      status,
      event_date,
      total_price,
      package_version_id,
      lead_source,
      package_version:package_versions(
        version_number,
        version_name,
        currency,
        package_template:package_templates!package_versions_package_template_id_fkey(name)
      )
    `
    )
    .eq("photographer_id", user.id)
    .gte("event_date", from)
    .lte("event_date", to);

  if (error) throw error;

  return (data ?? []) as unknown as AnalyticsBooking[];
}
