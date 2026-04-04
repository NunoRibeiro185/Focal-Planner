"use client";

import { useState, useTransition, useCallback } from "react";
import { format, addMonths, subMonths, parseISO, setMonth, setYear } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthGrid } from "@/components/calendar/month-grid";
import { AgendaView } from "@/components/calendar/agenda-view";
import { NewEventPicker } from "@/components/calendar/new-event-picker";
import { QuickBookingDialog } from "@/components/calendar/quick-booking-dialog";
import { PersonalEventDialog } from "@/components/calendar/personal-event-dialog";
import { fetchCalendarEvents } from "@/lib/actions/calendar";
import { getMonthDateRange } from "@/components/calendar/calendar-event-utils";
import type { CalendarEvent, PersonalEvent, PackageTemplateWithVersion } from "@/lib/types";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type View = "month" | "agenda";

interface CalendarShellProps {
  prefetchedEvents: CalendarEvent[];
  prefetchStart: string;
  prefetchEnd: string;
  futureEvents: CalendarEvent[];
  packages: PackageTemplateWithVersion[];
  initialMonth: Date;
}

/**
 * Filters a flat list of events to those visible in the given month grid window.
 * An event is visible if it overlaps [start, end].
 */
function filterEventsForRange(
  events: CalendarEvent[],
  start: string,
  end: string
): CalendarEvent[] {
  const rangeStart = parseISO(start);
  const rangeEnd = parseISO(end);
  return events.filter((e) => {
    const eStart = parseISO(e.start);
    const eEnd = parseISO(e.end);
    return eStart <= rangeEnd && eEnd >= rangeStart;
  });
}

export function CalendarShell({
  prefetchedEvents,
  prefetchStart,
  prefetchEnd,
  futureEvents,
  packages,
  initialMonth,
}: CalendarShellProps) {
  const [view, setView] = useState<View>("month");
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // Cached events — starts with prefetched data, grows as user navigates
  const [cachedEvents, setCachedEvents] = useState(prefetchedEvents);
  const [cacheStart, setCacheStart] = useState(prefetchStart);
  const [cacheEnd, setCacheEnd] = useState(prefetchEnd);

  const [, startTransition] = useTransition();

  // Month/year jump picker
  const [jumpPickerOpen, setJumpPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());

  const jumpToMonth = useCallback((year: number, month: number) => {
    const target = setMonth(setYear(currentMonth, year), month);
    setCurrentMonth(target);
    setJumpPickerOpen(false);

    const { start, end } = getMonthDateRange(year, month);
    const needsFetch = start < cacheStart || end > cacheEnd;
    if (!needsFetch) return;

    startTransition(async () => {
      const newEvents = await fetchCalendarEvents(start, end);
      setCachedEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const fresh = newEvents.filter((e) => !ids.has(e.id));
        return [...prev, ...fresh];
      });
      if (start < cacheStart) setCacheStart(start);
      if (end > cacheEnd) setCacheEnd(end);
    });
  }, [currentMonth, cacheStart, cacheEnd]);

  // Dialog state
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [personalEventOpen, setPersonalEventOpen] = useState(false);
  const [editingPersonalEvent, setEditingPersonalEvent] = useState<PersonalEvent | null>(null);

  // Derive visible events by filtering the cache — instant, no network call
  const { start: gridStart, end: gridEnd } = getMonthDateRange(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );
  const visibleEvents = filterEventsForRange(cachedEvents, gridStart, gridEnd);

  const refreshCache = useCallback(() => {
    startTransition(async () => {
      const fresh = await fetchCalendarEvents(cacheStart, cacheEnd);
      setCachedEvents(fresh);
    });
  }, [cacheStart, cacheEnd]);

  const navigateMonth = useCallback((direction: "prev" | "next") => {
    const next = direction === "next"
      ? addMonths(currentMonth, 1)
      : subMonths(currentMonth, 1);
    setCurrentMonth(next);

    const { start, end } = getMonthDateRange(next.getFullYear(), next.getMonth());

    // Only fetch from server if the target month is outside the cached range
    const needsFetch = start < cacheStart || end > cacheEnd;
    if (!needsFetch) return;

    startTransition(async () => {
      const newEvents = await fetchCalendarEvents(start, end);
      setCachedEvents((prev) => {
        // Merge: deduplicate by id
        const ids = new Set(prev.map((e) => e.id));
        const fresh = newEvents.filter((e) => !ids.has(e.id));
        return [...prev, ...fresh];
      });
      // Expand cache boundaries
      if (start < cacheStart) setCacheStart(start);
      if (end > cacheEnd) setCacheEnd(end);
    });
  }, [currentMonth, cacheStart, cacheEnd]);

  function handleDayClick(date: Date) {
    setClickedDate(date);
    setPickerOpen(true);
  }

  function handlePersonalEventClick(event: Extract<CalendarEvent, { kind: "personal" }>) {
    setEditingPersonalEvent({
      id: event.personalEventId,
      photographer_id: "",
      title: event.title,
      start_date: event.start,
      end_date: event.end,
      all_day: event.allDay,
      start_time: null,
      end_time: null,
      tag: event.tag,
      color: event.color,
      notes: null,
      google_event_id: null,
      created_at: "",
      updated_at: "",
    });
    setPersonalEventOpen(true);
  }

  const defaultDateStr = clickedDate ? format(clickedDate, "yyyy-MM-dd") : undefined;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {view === "month" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth("prev")}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={jumpPickerOpen} onOpenChange={(o) => {
                setJumpPickerOpen(o);
                if (o) setPickerYear(currentMonth.getFullYear());
              }}>
                <PopoverTrigger asChild>
                  <button className="text-base sm:text-lg font-semibold text-center whitespace-nowrap px-1 rounded hover:bg-accent transition-colors cursor-pointer w-36 sm:w-44">
                    {format(currentMonth, "MMMM yyyy")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="center">
                  {/* Year navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(y => y - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-sm">{pickerYear}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(y => y + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-1">
                    {MONTH_NAMES.map((name, idx) => {
                      const isActive = pickerYear === currentMonth.getFullYear() && idx === currentMonth.getMonth();
                      return (
                        <button
                          key={name}
                          onClick={() => jumpToMonth(pickerYear, idx)}
                          className={`rounded py-1.5 text-sm transition-colors hover:bg-accent ${isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth("next")}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {view === "agenda" && (
            <h2 className="text-base sm:text-lg font-semibold">Upcoming</h2>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-md border p-1 shrink-0">
          <Button
            variant={view === "month" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("month")}
            className="gap-1.5 px-2 sm:px-3"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Month</span>
          </Button>
          <Button
            variant={view === "agenda" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("agenda")}
            className="gap-1.5 px-2 sm:px-3"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Agenda</span>
          </Button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex flex-col min-h-0 rounded-lg border overflow-hidden
        h-[min(calc(100dvh-180px),560px)]
        md:flex-1 md:h-auto">
        {view === "month" ? (
          <MonthGrid
            events={visibleEvents}
            currentMonth={currentMonth}
            onDayClick={handleDayClick}
            onPersonalEventClick={handlePersonalEventClick}
            onEventSaved={refreshCache}
          />
        ) : (
          <AgendaView
            events={futureEvents}
            onPersonalEventClick={handlePersonalEventClick}
          />
        )}
      </div>

      {/* Dialogs */}
      <NewEventPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectBooking={() => setQuickBookingOpen(true)}
        onSelectPersonal={() => setPersonalEventOpen(true)}
      />

      <QuickBookingDialog
        open={quickBookingOpen}
        onOpenChange={setQuickBookingOpen}
        defaultDate={defaultDateStr}
        packages={packages}
      />

      <PersonalEventDialog
        open={personalEventOpen}
        onOpenChange={(open) => {
          setPersonalEventOpen(open);
          if (!open) setEditingPersonalEvent(null);
        }}
        defaultDate={defaultDateStr}
        event={editingPersonalEvent ?? undefined}
        onSaved={refreshCache}
      />
    </div>
  );
}
