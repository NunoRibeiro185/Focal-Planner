import Link from "next/link";
import { getBookings } from "@/lib/queries/bookings";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { Plus, AlertCircle } from "lucide-react";

export default async function BookingsPage() {
  const bookings = await getBookings();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
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
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Package</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Total</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="font-medium hover:underline"
                    >
                      {booking.client_name_primary}
                      {booking.client_name_secondary && (
                        <span >
                          {" "}& {booking.client_name_secondary}
                        </span>
                      )}
                    </Link>
                    {booking.venue_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {booking.venue_name}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(booking.event_date), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {booking.package_version?.currency
                      ? `v${booking.package_version.version_number}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(
                      booking.total_price,
                      booking.package_version?.currency ?? "EUR"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-1.5">
                      {booking.overdue && (
                        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className={booking.overdue ? "text-destructive font-medium" : ""}>
                        {formatCurrency(
                          booking.balance,
                          booking.package_version?.currency ?? "EUR"
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
