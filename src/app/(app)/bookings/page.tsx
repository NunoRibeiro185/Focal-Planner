import Link from "next/link";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { getBookings, getArchivedBookings, getBookingsThisMonthCount } from "@/lib/queries/bookings";
import { getPendingSecondShooterInvites } from "@/lib/queries/second-shooter";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { PendingInvitesBanner } from "@/components/bookings/pending-invites-banner";
import { NewBookingButton } from "@/components/paywall/new-booking-button";
import { unarchiveBooking } from "@/lib/actions/bookings";
import { BookingListActions } from "@/components/bookings/booking-list-actions";
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

  const isArchiveTab = filter === "archived";

  const [allBookings, archivedBookings, pendingInvites, bookingsThisMonth] = await Promise.all([
    isArchiveTab ? Promise.resolve([]) : getBookings(),
    isArchiveTab ? getArchivedBookings() : Promise.resolve([]),
    user ? getPendingSecondShooterInvites(user.id) : Promise.resolve([]),
    getBookingsThisMonthCount(),
  ]);

  const bookings = isArchiveTab
    ? archivedBookings
    : filter === "inquiries"
      ? allBookings.filter((b) => b.status === "inquiry")
      : filter === "active"
        ? allBookings.filter((b) => b.status !== "inquiry" && b.status !== "cancelled" && b.status !== "done")
        : allBookings;

  const tabs = [
    { label: "All", value: undefined },
    { label: "Active", value: "active" },
    { label: "Inquiries", value: "inquiries" },
    { label: "Archived", value: "archived" },
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
        {!isArchiveTab && <NewBookingButton currentCount={bookingsThisMonth} />}
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
        isArchiveTab ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No archived bookings.</p>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No bookings yet</p>
            <p className="text-sm mt-1">Create your first booking to get started.</p>
            <div className="mt-4">
              <NewBookingButton currentCount={bookingsThisMonth} />
            </div>
          </div>
        )
      ) : isArchiveTab ? (
        /* ── Archived view ── */
        <>
          {/* Mobile */}
          <div className="md:hidden divide-y rounded-lg border overflow-hidden opacity-80">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <PrefetchLink href={`/bookings/${booking.id}`} className="min-w-0 flex-1">
                  <p className="font-medium truncate text-muted-foreground">
                    {booking.client_name_primary}
                    {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground/70">
                      {booking.event_date
                        ? format(new Date(booking.event_date), "d MMM yyyy")
                        : "Date TBD"}
                    </span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </PrefetchLink>
                <form action={unarchiveBooking.bind(null, booking.id)}>
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded hover:bg-muted/60"
                  >
                    Unarchive
                  </button>
                </form>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block rounded-lg border overflow-hidden opacity-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <PrefetchLink
                        href={`/bookings/${booking.id}`}
                        className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {booking.client_name_primary}
                        {booking.client_name_secondary && (
                          <span> & {booking.client_name_secondary}</span>
                        )}
                      </PrefetchLink>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground/70">
                      {booking.event_date
                        ? format(new Date(booking.event_date), "dd MMM yyyy")
                        : <span className="italic">TBD</span>}
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={unarchiveBooking.bind(null, booking.id)}>
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/60"
                        >
                          Unarchive
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="group hover:bg-muted/30 transition-colors">
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
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3">
                      <BookingListActions
                        bookingId={booking.id}
                        clientName={booking.client_name_primary}
                      />
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
