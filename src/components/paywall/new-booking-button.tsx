"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UsageLimit } from "@/components/paywall/usage-limit";
import { Plus } from "lucide-react";

export function NewBookingButton({ currentCount }: { currentCount: number }) {
  return (
    <UsageLimit
      resource="bookingsPerMonth"
      currentCount={currentCount}
      resourceLabel="bookings this month"
    >
      <Button asChild>
        <Link href="/bookings/new">
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </Button>
    </UsageLimit>
  );
}
