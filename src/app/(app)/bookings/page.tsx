import Link from "next/link";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { getBookings } from "@/lib/queries/bookings";
import { getPendingSecondShooterInvites } from "@/lib/queries/second-shooter";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { PendingInvitesBanner } from "@/components/bookings/pending-invites-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

export default async function BookingsPage({ searchParams }: Props) {
  const { filter } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [allBookings, pendingInvites] = await Promise.all([
    getBookings(),
    user ? getPendingSecondShooterInvites(user.id) : Promise.resolve([]),
  ]);

  const bookings =
    filter === "inquiries"
      ? allBookings.filter((b) => b.status === "inquiry")
      : filter === "active"
        ? allBookings.filter((b) => b.status !== "inquiry" && b.status !== "cancelled" && b.status !== "done")
        : allBookings;

  const tabs = [
    { label: "All", value: undefined },
    { label: "Inquiries", value: "inquiries" },
    { label: "Active", value: "active" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/bookings/new">
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      <PendingInvitesBanner invites={pendingInvites} />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b">
        {tabs.map((tab) => {
          const active = (filter ?? undefined) === tab.value;
          const href = tab.value ? `/bookings?filter=${tab.value}` : "/bookings";
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Create your first booking to get started.</p>
          <Button asChild className="mt-4">
            <Link href="/bookings/new">
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ── Mobile card list ── */}
          <div className="md:hidden divide-y rounded-lg border overflow-hidden">
            {bookings.map((booking) => (
              <PrefetchLink
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {booking.client_name_primary}
                    {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {booking.event_date
                        ? format(new Date(booking.event_date), "d MMM yyyy")
                        : "Date TBD"}
                    </span>
                    {booking.package_name && (
                      <span className="text-xs text-muted-foreground">
                        {booking.package_name} v{booking.package_version?.version_number}
                      </span>
                    )}
                    <BookingStatusBadge status={booking.status} />
                    {booking.is_second_shooter && (
                      <Badge variant="secondary" className="text-xs">2nd Shooter</Badge>
                    )}
                  </div>
                </div>
              </PrefetchLink>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Package</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <PrefetchLink href={`/bookings/${booking.id}`} className="font-medium hover:underline">
                        {booking.client_name_primary}
                        {booking.client_name_secondary && (
                          <span> & {booking.client_name_secondary}</span>
                        )}
                      </PrefetchLink>
                      {booking.venue_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{booking.venue_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {booking.event_date
                        ? format(new Date(booking.event_date), "dd MMM yyyy")
                        : <span className="italic">TBD</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {booking.package_name
                        ? `${booking.package_name} v${booking.package_version?.version_number}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <BookingStatusBadge status={booking.status} />
                        {booking.is_second_shooter && (
                          <Badge variant="secondary" className="text-xs">2nd Shooter</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
