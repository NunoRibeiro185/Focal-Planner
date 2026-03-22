"use client";

import { format, parseISO, isSameDay } from "date-fns";
import { Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/lib/types";

interface PersonalEventPreviewPopoverProps {
  event: Extract<CalendarEvent, { kind: "personal" }>;
  onEdit: (event: Extract<CalendarEvent, { kind: "personal" }>) => void;
  onWillClose?: () => void;
  children: React.ReactNode;
}

export function PersonalEventPreviewPopover({
  event,
  onEdit,
  onWillClose,
  children,
}: PersonalEventPreviewPopoverProps) {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const isMultiDay = !isSameDay(start, end);

  const dateLabel = isMultiDay
    ? `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`
    : format(start, "EEEE, d MMMM yyyy");

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-4 space-y-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={() => onWillClose?.()}
      >
        <div>
          <div
            className="w-2.5 h-2.5 rounded-full mb-2"
            style={{ backgroundColor: event.color }}
          />
          <p className="font-semibold text-sm leading-tight">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>

        {event.tag && (
          <p className="text-xs text-muted-foreground capitalize">{event.tag}</p>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => onEdit(event)}
        >
          <Pencil className="h-3 w-3" />
          Edit event
        </Button>
      </PopoverContent>
    </Popover>
  );
}
