"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getMonthGrid,
  groupEventsByDate,
  getEventsForDay,
} from "@/components/calendar/calendar-event-utils";
import { parseISO, format, isSameDay, isSameMonth } from "date-fns";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapPin, Clock, Camera, Pencil, Check, X, CalendarPlus } from "lucide-react";
import { updateBookingQuick } from "@/lib/actions/bookings";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

interface AvailabilityCalendarPanelProps {
  eventDate: string | null;
  location: string | null;
  events: CalendarEvent[];
  /** The booking's own ID — excluded from event dots to avoid self-reference. */
  bookingId: string;
}

export function AvailabilityCalendarPanel({
  eventDate,
  location,
  events,
  bookingId,
}: AvailabilityCalendarPanelProps) {
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [editingDateTime, setEditingDateTime] = useState(false);
  const [draftDate, setDraftDate] = useState(eventDate ?? "");
  const [draftTime, setDraftTime] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setDraftDate(eventDate ?? "");
    setDraftTime("");
    setEditingDateTime(true);
  }

  function handleSaveDateTime() {
    if (!draftDate) return;
    startTransition(async () => {
      await updateBookingQuick(bookingId, {
        event_date: draftDate,
        start_time: draftTime || null,
      });
      setEditingDateTime(false);
    });
  }

  // Empty state: no date set yet
  if (!eventDate && !editingDateTime) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <CalendarPlus className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No date set yet.</p>
          <Button variant="outline" size="sm" onClick={startEditing}>
            Set date
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inline date/time editor
  if (editingDateTime) {
    return (
      <Card>
        <CardContent className="pt-5 space-y-3">
          <p className="text-sm font-medium">
            {eventDate ? "Change date & time" : "Set event date"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start time</Label>
              <Input
                type="time"
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveDateTime} disabled={isPending || !draftDate}>
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingDateTime(false)}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calendar view
  const date = parseISO(eventDate!);
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = getMonthGrid(year, month);

  const filteredEvents = events.filter(
    (e) => !(e.kind === "booking" && e.bookingId === bookingId)
  );
  const grouped = groupEventsByDate(filteredEvents);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            {location && (
              <>
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{location}</span>
                <span className="text-muted-foreground mx-0.5">·</span>
              </>
            )}
            <span className="text-muted-foreground">
              {format(date, "EEEE, d MMMM yyyy")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
            onClick={startEditing}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs text-muted-foreground py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(grouped, day);
            const isEventDay = isSameDay(day, date);
            const isThisMonth = isSameMonth(day, date);
            const hasEvents = dayEvents.length > 0;

            const cell = (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center py-0.5",
                  !isThisMonth && "opacity-30",
                  hasEvents && "cursor-pointer"
                )}
                onMouseEnter={() => hasEvents && setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span
                  className={cn(
                    "text-xs w-6 h-6 flex items-center justify-center rounded-full",
                    isEventDay &&
                      "bg-primary text-primary-foreground font-semibold"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5 h-1.5">
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <div
                        key={j}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: e.color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );

            if (!hasEvents) return cell;

            return (
              <Popover
                key={i}
                open={hoveredDay !== null && isSameDay(day, hoveredDay)}
              >
                <PopoverTrigger asChild>{cell}</PopoverTrigger>
                <PopoverContent
                  className="w-56 p-3"
                  side="top"
                  align="center"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {format(day, "EEE, d MMM")}
                  </p>
                  <div className="space-y-2">
                    {dayEvents.map((event, j) => (
                      <DayEventRow key={j} event={event} />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DayEventRow({ event }: { event: CalendarEvent }) {
  if (event.kind === "booking") {
    return (
      <div className="flex items-start gap-2">
        <div
          className="mt-1 h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: event.color }}
        />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{event.clientName}</p>
          {event.venueName && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {event.venueName}
            </p>
          )}
          {event.startTime && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              {event.startTime}
              {event.hoursOfCoverage && ` · ${event.hoursOfCoverage}h`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-1 h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: event.color }}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{event.title}</p>
        {event.tag && (
          <p className="text-xs text-muted-foreground capitalize">{event.tag}</p>
        )}
      </div>
    </div>
  );
}
