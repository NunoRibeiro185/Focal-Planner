import { createClient } from "@/lib/supabase/server";
import type { AnalyticsBooking } from "@/lib/utils/analytics";

/**
 * Returns the distinct years (from event_date) in which the photographer
 * has at least one booking, sorted descending (most recent first).
 */
export async function getBookingYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("event_date");

  if (error) throw error;

  const years = [
    ...new Set((data ?? []).map((b) => new Date(b.event_date).getFullYear())),
  ].sort((a, b) => b - a);

  return years;
}

/**
 * Returns all bookings for a given year with the joined package version data
 * needed by the analytics computation functions.
 */
export async function getAnalyticsBookings(
  year: number
): Promise<AnalyticsBooking[]> {
  const supabase = await createClient();
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
        currency,
        package_template:package_templates!package_versions_package_template_id_fkey(name)
      )
    `
    )
    .gte("event_date", from)
    .lte("event_date", to);

  if (error) throw error;

  // Supabase types the joined relation as an array; cast via unknown
  return (data ?? []) as unknown as AnalyticsBooking[];
}
