"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptPendingInviteInApp } from "@/lib/actions/second-shooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, UserPlus } from "lucide-react";
import { format } from "date-fns";
import type { PendingSecondShooterInvite } from "@/lib/queries/second-shooter";

interface PendingInvitesBannerProps {
  invites: PendingSecondShooterInvite[];
}

export function PendingInvitesBanner({ invites }: PendingInvitesBannerProps) {
  if (invites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Pending invites
        </h2>
        <Badge variant="secondary" className="text-xs">{invites.length}</Badge>
      </div>
      {invites.map((invite) => (
        <InviteCard key={invite.id} invite={invite} />
      ))}
    </div>
  );
}

function InviteCard({ invite }: { invite: PendingSecondShooterInvite }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptPendingInviteInApp(invite.id);
      if (result.success) {
        router.push(`/bookings/${invite.id}`);
      }
    });
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="font-medium">
              {invite.client_name_primary}
              {invite.client_name_secondary && ` & ${invite.client_name_secondary}`}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {invite.photographer_full_name && (
                <span className="text-xs text-muted-foreground">
                  from {invite.photographer_full_name}
                </span>
              )}
              {invite.event_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(invite.event_date), "d MMM yyyy")}
                </span>
              )}
              {invite.venue_name && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {invite.venue_name}
                </span>
              )}
              {invite.second_shooter_fee != null && (
                <span className="text-xs font-medium">
                  Fee: {invite.second_shooter_fee.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? "Accepting…" : "Accept"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
