"use client";

import { useState } from "react";
import { PasswordGate } from "@/components/second-shooter/password-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Clock, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import type { SecondShooterView } from "@/lib/queries/second-shooter";

interface PublicSecondShooterViewProps {
  bookingId: string;
  view: SecondShooterView;
  isAuthenticated: boolean;
}

export function PublicSecondShooterView({
  bookingId,
  view,
  isAuthenticated: initialAuth,
}: PublicSecondShooterViewProps) {
  const [authenticated, setAuthenticated] = useState(initialAuth);

  if (!authenticated) {
    return (
      <PasswordGate
        bookingId={bookingId}
        onSuccess={() => setAuthenticated(true)}
      />
    );
  }

  const { booking, itineraryStops } = view;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div>
          <Badge variant="secondary" className="mb-2 text-xs">2nd Shooter</Badge>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] leading-tight tracking-wide">
            {booking.client_name_primary}
            {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {booking.venue_name && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {booking.venue_name}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {booking.event_date
                ? format(new Date(booking.event_date), "EEEE, d MMMM yyyy")
                : "Date TBD"}
            </span>
            {booking.start_time && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {booking.start_time}
              </span>
            )}
          </div>
        </div>

        {/* Fee */}
        {booking.second_shooter_fee != null && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Your fee:</span>
                <span className="font-semibold">
                  {booking.second_shooter_fee.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{booking.client_name_primary}</p>
            {booking.client_name_secondary && (
              <p className="text-muted-foreground">{booking.client_name_secondary}</p>
            )}
            {booking.second_shooter_show_client_contact && (
              <>
                {booking.client_email && (
                  <a href={`mailto:${booking.client_email}`} className="text-muted-foreground hover:text-foreground text-xs block">
                    {booking.client_email}
                  </a>
                )}
                {booking.client_phone && (
                  <a href={`tel:${booking.client_phone}`} className="text-muted-foreground hover:text-foreground text-xs block">
                    {booking.client_phone}
                  </a>
                )}
              </>
            )}
            {booking.venue_address && (
              <>
                <Separator className="my-2" />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(booking.venue_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1 text-muted-foreground hover:text-foreground"
                >
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="text-xs">{booking.venue_address}</span>
                </a>
              </>
            )}
          </CardContent>
        </Card>

        {/* Itinerary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Itinerary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {itineraryStops.length > 0 ? (
              <div className="space-y-1">
                {itineraryStops.map((stop) => (
                  <div key={stop.id} className="flex items-start gap-2 py-1.5">
                    {stop.start_time && (
                      <span className="tabular-nums text-muted-foreground text-xs pt-0.5 w-10 shrink-0">
                        {stop.start_time.slice(0, 5)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{stop.name}</p>
                      {stop.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-1 text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="text-xs">{stop.address}</span>
                        </a>
                      )}
                      {stop.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{stop.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No itinerary added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        {booking.second_shooter_instructions && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{booking.second_shooter_instructions}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground/50 pt-4">Powered by Focal Planner</p>
      </div>
    </div>
  );
}
