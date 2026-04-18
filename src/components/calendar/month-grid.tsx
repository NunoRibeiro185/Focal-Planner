"use client";

import { format, isSameMonth, isSameDay, parseISO } from "date-fns";
import { useRef, useMemo, memo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMonthGrid,
  computeWeekSpans,
  formatEventTime,
  type SpanLayout,
} from "./calendar-event-utils";
import { BookingPreviewPopover } from "./booking-preview-popover";
import { PersonalEventPreviewPopover } from "./personal-event-preview-popover";
import type { CalendarEvent } from "@/lib/types";

/**
 * Returns true when `event` is an inquiry that shares its date with at least
 * one non-inquiry, non-cancelled booking.
 */
function hasBookingConflict(event: CalendarEvent, allEvents: CalendarEvent[]): boolean {
  if (event.kind !== "booking" || event.status !== "inquiry") return false;
  return allEvents.some(
    (e) =>
      e.kind === "booking" &&
      e.id !== event.id &&
      e.start === event.start &&
      e.status !== "inquiry" &&
      e.status !== "cancelled"
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LANE_HEIGHT_PX = 22;
const DAY_HEADER_HEIGHT_PX = 28;
const MAX_LANES = 3;

interface MonthGridProps {
  events: CalendarEvent[];
  currentMonth: Date;
  onDayClick: (date: Date) => void;
  onPersonalEventClick: (event: Extract<CalendarEvent, { kind: "personal" }>) => void;
  onEventSaved?: () => void;
}

export function MonthGrid({
  events,
  currentMonth,
  onDayClick,
  onPersonalEventClick,
  onEventSaved,
}: MonthGridProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getMonthGrid(year, month);
  const today = useMemo(() => new Date(), []);

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows — CSS grid distributes height equally */}
      <div
        className="flex-1 min-h-0"
        style={{ display: "grid", gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((weekDays, weekIdx) => (
          <WeekRow
            key={weekIdx}
            weekDays={weekDays}
            allEvents={events}
            currentMonth={currentMonth}
            today={today}
            onDayClick={onDayClick}
            onPersonalEventClick={onPersonalEventClick}
            onEventSaved={onEventSaved}
            isLastWeek={weekIdx === weeks.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface WeekRowProps {
  weekDays: Date[];
  allEvents: CalendarEvent[];
  currentMonth: Date;
  today: Date;
  onDayClick: (date: Date) => void;
  onPersonalEventClick: (event: Extract<CalendarEvent, { kind: "personal" }>) => void;
  onEventSaved?: () => void;
  isLastWeek: boolean;
}

const WeekRow = memo(function WeekRow({
  weekDays,
  allEvents,
  currentMonth,
  today,
  onDayClick,
  onPersonalEventClick,
  onEventSaved,
  isLastWeek,
}: WeekRowProps) {
  const suppressDayClick = useRef(false);

  function handleDayClick(day: Date) {
    if (suppressDayClick.current) {
      suppressDayClick.current = false;
      return;
    }
    onDayClick(day);
  }

  function handleWillClose() {
    suppressDayClick.current = true;
  }

  const spans = useMemo(() => computeWeekSpans(weekDays, allEvents), [weekDays, allEvents]);

  // Single-day events per cell: bookings on their start day, or personal events that start+end same day
  const singleDayEvents: CalendarEvent[][] = useMemo(
    () =>
      weekDays.map((day) =>
        allEvents.filter((e) => {
          if (!isSameDay(parseISO(e.start), day)) return false;
          if (e.kind === "booking") return true;
          return isSameDay(parseISO(e.start), parseISO(e.end));
        })
      ),
    [weekDays, allEvents]
  );

  // Pre-compute conflict set so hasBookingConflict isn't called multiple times per event
  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    for (const event of allEvents) {
      if (hasBookingConflict(event, allEvents)) set.add(event.id);
    }
    return set;
  }, [allEvents]);

  // Height of the spans layer (capped at MAX_LANES)
  const maxLane = spans.reduce((m, s) => Math.max(m, s.lane), -1);
  const visibleLanes = Math.min(maxLane + 1, MAX_LANES);
  const spansLayerHeight = visibleLanes * LANE_HEIGHT_PX;

  return (
    <div
      className={cn("relative overflow-hidden", !isLastWeek && "border-b")}
    >
      {/* Day cells: backgrounds, borders, day numbers, single-day events */}
      <div className="grid grid-cols-7 h-full">
        {weekDays.map((day, col) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          // Count visible spans passing through this col to determine available slots
          const spansThrough = spans.filter(
            (s) => s.startCol <= col && col <= s.endCol && s.lane < MAX_LANES
          ).length;
          const hiddenSpans = spans.filter(
            (s) => s.startCol <= col && col <= s.endCol && s.lane >= MAX_LANES
          ).length;
          const available = Math.max(0, MAX_LANES - spansThrough);
          const visible = singleDayEvents[col].slice(0, available);
          const overflow = hiddenSpans + Math.max(0, singleDayEvents[col].length - available);

          return (
            <div
              key={col}
              className={cn(
                "border-r last:border-r-0 overflow-hidden cursor-pointer hover:bg-muted/40 transition-colors",
                !isCurrentMonth && "bg-muted/20"
              )}
              onClick={() => handleDayClick(day)}
            >
              {/* Day number */}
              <div className="flex justify-end p-1" style={{ height: DAY_HEADER_HEIGHT_PX }}>
                <span
                  className={cn(
                    "text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Spacer to push single-day events below the spans layer */}
              <div style={{ height: spansLayerHeight + 2 }} />

              {/* Single-day events */}
              <div className="px-0.5 space-y-0.5 pb-1">
                {visible.map((event) =>
                  event.kind === "booking" ? (
                    <BookingPreviewPopover key={event.id} event={event} onSaved={onEventSaved} onWillClose={handleWillClose} hasConflict={conflictIds.has(event.id)}>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left"
                      >
                        <EventChip event={event} hasConflict={conflictIds.has(event.id)} />
                      </button>
                    </BookingPreviewPopover>
                  ) : (
                    <PersonalEventPreviewPopover
                      key={event.id}
                      event={event}
                      onEdit={onPersonalEventClick}
                      onWillClose={handleWillClose}
                    >
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left"
                      >
                        <EventChip event={event} />
                      </button>
                    </PersonalEventPreviewPopover>
                  )
                )}
                {overflow > 0 && (
                  <p className="text-xs text-muted-foreground px-1">
                    +{overflow} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Span overlay — absolutely positioned over the day cells */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: DAY_HEADER_HEIGHT_PX }}
      >
        {spans
          .filter((s) => s.lane < MAX_LANES)
          .map((span) => (
            <div
              key={`${span.event.id}-${span.startCol}`}
              className="absolute pointer-events-auto"
              style={{
                left: `calc(${(span.startCol / 7) * 100}% + 2px)`,
                width: `calc(${((span.endCol - span.startCol + 1) / 7) * 100}% - 4px)`,
                top: span.lane * LANE_HEIGHT_PX,
                height: LANE_HEIGHT_PX - 2,
              }}
            >
              {span.event.kind === "booking" ? (
                <BookingPreviewPopover event={span.event} onSaved={onEventSaved} onWillClose={handleWillClose} hasConflict={conflictIds.has(span.event.id)}>
                  <button className="w-full h-full block">
                    <SpanBar span={span} hasConflict={conflictIds.has(span.event.id)} />
                  </button>
                </BookingPreviewPopover>
              ) : (
                <PersonalEventPreviewPopover
                  event={span.event as Extract<CalendarEvent, { kind: "personal" }>}
                  onEdit={onPersonalEventClick}
                  onWillClose={handleWillClose}
                >
                  <button
                    className="w-full h-full block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SpanBar span={span} />
                  </button>
                </PersonalEventPreviewPopover>
              )}
            </div>
          ))}
      </div>
    </div>
  );
});

function SpanBar({ span, hasConflict }: { span: SpanLayout; hasConflict?: boolean }) {
  return (
    <div
      className={cn(
        "h-full flex items-center px-1.5 text-white text-xs truncate",
        span.isStart ? "rounded-l" : "rounded-l-none",
        span.isEnd ? "rounded-r" : "rounded-r-none"
      )}
      style={{ backgroundColor: span.event.color }}
    >
      {hasConflict && span.isStart && (
        <AlertTriangle className="h-3 w-3 shrink-0 mr-1 text-yellow-300" />
      )}
      <span className="truncate">{span.isStart ? span.event.title : ""}</span>
    </div>
  );
}

function EventChip({ event, hasConflict }: { event: CalendarEvent; hasConflict?: boolean }) {
  const time = formatEventTime(event);
  return (
    <div
      className="flex items-center gap-1 rounded px-1 py-0.5 text-white text-xs truncate"
      style={{ backgroundColor: event.color }}
    >
      {hasConflict && <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-300" />}
      {time && <span className="shrink-0 opacity-80">{time}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  );
}
