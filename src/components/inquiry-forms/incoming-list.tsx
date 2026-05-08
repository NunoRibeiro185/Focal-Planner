import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

interface IncomingBooking {
  id: string;
  client_name_primary: string;
  client_email: string | null;
  created_at: string;
  inquiry_form_name_snapshot: string | null;
}

interface Props { bookings: IncomingBooking[]; }

export function IncomingList({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No incoming inquiries right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <Link
          key={b.id}
          href={`/bookings/${b.id}`}
          className="rounded-xl border bg-card p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{b.client_name_primary}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {b.client_email && (
                <p className="text-xs text-muted-foreground truncate">{b.client_email}</p>
              )}
              {b.inquiry_form_name_snapshot && (
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 shrink-0">
                  {b.inquiry_form_name_snapshot}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {format(new Date(b.created_at), "d MMM yyyy")}
            </p>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}
