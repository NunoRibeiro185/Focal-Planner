import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCalendarEvents, getFutureCalendarEvents } from "@/lib/services/calendar-aggregator";
import { getPackageTemplates } from "@/lib/queries/packages";
import { format, subMonths, addMonths, endOfMonth } from "date-fns";
import { CalendarShell } from "./calendar-shell";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();

  // Prefetch 1 month back + 5 months ahead so navigation is instant
  const prefetchStart = format(subMonths(today, 1), "yyyy-MM-01");
  const prefetchEnd = format(endOfMonth(addMonths(today, 5)), "yyyy-MM-dd");

  const [prefetchedEvents, futureEvents, packages] = await Promise.all([
    getCalendarEvents(prefetchStart, prefetchEnd),
    getFutureCalendarEvents(),
    getPackageTemplates(),
  ]);

  return (
    <div className="flex flex-col h-full px-4 py-4 md:px-18 md:py-20">
      <CalendarShell
        prefetchedEvents={prefetchedEvents}
        prefetchStart={prefetchStart}
        prefetchEnd={prefetchEnd}
        futureEvents={futureEvents}
        packages={packages as any}
        initialMonth={today}
      />
    </div>
  );
}
