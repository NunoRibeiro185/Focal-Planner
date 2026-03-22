"use client";

import { groupEventsForAgenda, formatEventTime } from "./calendar-event-utils";
import { BookingPreviewPopover } from "./booking-preview-popover";
import type { CalendarEvent } from "@/lib/types";
import { CalendarX } from "lucide-react";

interface AgendaViewProps {
  events: CalendarEvent[];
  onPersonalEventClick: (event: Extract<CalendarEvent, { kind: "personal" }>) => void;
}

export function AgendaView({ events, onPersonalEventClick }: AgendaViewProps) {
  const groups = groupEventsForAgenda(events);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground py-20">
        <CalendarX className="h-10 w-10 opacity-40" />
        <p className="text-sm">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 py-4">
      {groups.map(({ dateKey, label, events: dayEvents }) => (
        <div key={dateKey}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {label}
          </p>
          <div className="space-y-1">
            {dayEvents.map((event) =>
              event.kind === "booking" ? (
                <BookingPreviewPopover key={event.id} event={event}>
                  <button className="w-full text-left">
                    <AgendaRow event={event} />
                  </button>
                </BookingPreviewPopover>
              ) : (
                <button
                  key={event.id}
                  className="w-full text-left"
                  onClick={() => onPersonalEventClick(event)}
                >
                  <AgendaRow event={event} />
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgendaRow({ event }: { event: CalendarEvent }) {
  const time = formatEventTime(event);
  const tag = event.kind === "personal" ? event.tag : null;

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors group">
      {/* Colored left bar */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: event.color }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {time || "All day"}
          {tag && ` · ${tag}`}
        </p>
      </div>
    </div>
  );
}
