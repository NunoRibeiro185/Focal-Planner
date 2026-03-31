"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TasksPanel } from "@/components/bookings/tasks-panel";
import { MapPin, Calendar, Clock, DollarSign, FileText, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { saveSecondShooterNotes } from "@/lib/actions/second-shooter";
import type { SecondShooterView } from "@/lib/queries/second-shooter";
import type { BookingTask, SecondShooterNote } from "@/lib/types";

interface SecondShooterBookingViewProps {
  view: SecondShooterView;
  tasks: BookingTask[];
  privateNotes: SecondShooterNote | null;
  bookingId: string;
}

export function SecondShooterBookingView({
  view,
  tasks,
  privateNotes,
  bookingId,
}: SecondShooterBookingViewProps) {
  const { booking, itineraryStops } = view;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">2nd Shooter</Badge>
          </div>
          <h1 className="text-3xl sm:text-5xl font-[family-name:var(--font-heading)] leading-tight tracking-wide">
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
            {booking.second_shooter_fee != null && (
              <span className="flex items-center gap-1 text-sm font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                {booking.second_shooter_fee.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Itinerary */}
        <ReadOnlyItineraryCard
          stops={itineraryStops}
          venueAddress={booking.venue_address}
        />

        {/* Client info */}
        <ClientCard
          booking={booking}
        />
      </div>

      {/* ── Instructions from primary photographer ── */}
      {booking.second_shooter_instructions && (
        <InstructionsCard instructions={booking.second_shooter_instructions} />
      )}

      {/* ── Private notes + tasks ── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <PrivateNotesCard notes={privateNotes?.notes ?? null} bookingId={bookingId} />
        <TasksPanel tasks={tasks} bookingId={bookingId} />
      </div>
    </div>
  );
}

// ─── Sub-cards ────────────────────────────────────────────────────────────────

function ReadOnlyItineraryCard({
  stops,
  venueAddress,
}: {
  stops: SecondShooterView["itineraryStops"];
  venueAddress: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Itinerary
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {stops.length > 0 ? (
          stops.map((stop) => (
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
          ))
        ) : venueAddress ? (
          <div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(venueAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1 text-muted-foreground hover:text-foreground"
            >
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="text-xs">{venueAddress}</span>
            </a>
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">No itinerary yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ClientCard({ booking }: { booking: SecondShooterView["booking"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">{booking.client_name_primary}</p>
        {booking.client_name_secondary && (
          <p className="text-muted-foreground">{booking.client_name_secondary}</p>
        )}
        {booking.second_shooter_show_client_contact && (
          <>
            {booking.client_email && (
              <a
                href={`mailto:${booking.client_email}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">{booking.client_email}</span>
              </a>
            )}
            {booking.client_phone && (
              <a
                href={`tel:${booking.client_phone}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">{booking.client_phone}</span>
              </a>
            )}
          </>
        )}
        {booking.venue_address && (
          <div>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstructionsCard({ instructions }: { instructions: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Instructions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{instructions}</p>
      </CardContent>
    </Card>
  );
}

function PrivateNotesCard({
  notes: initialNotes,
  bookingId,
}: {
  notes: string | null;
  bookingId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  function handleSave() {
    startTransition(async () => {
      await saveSecondShooterNotes(bookingId, draft.trim() || null);
      setEditing(false);
    });
  }

  function handleCancel() {
    setDraft(initialNotes ?? "");
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            My notes
          </CardTitle>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              placeholder="Your private notes for this shoot…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : initialNotes ? (
          <p className="text-sm whitespace-pre-wrap">{initialNotes}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No notes yet — click Edit to add your own.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
