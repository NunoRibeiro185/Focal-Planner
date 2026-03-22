import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABELS } from "@/lib/utils/booking-status";
import type { BookingStatus } from "@/lib/types";

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"
> = {
  inquiry: "outline",
  confirmed: "info",
  shoot_completed: "secondary",
  editing: "warning",
  delivered: "success",
  done: "default",
  cancelled: "destructive",
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
