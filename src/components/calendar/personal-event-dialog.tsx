"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createPersonalEvent, updatePersonalEvent, deletePersonalEvent } from "@/lib/actions/personal-events";
import { personalEventFormSchema, type PersonalEventFormValues } from "@/lib/types/forms";
import type { PersonalEvent } from "@/lib/types";
import { Trash2 } from "lucide-react";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6b7280", // gray
];

interface PersonalEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string; // pre-fill start_date
  event?: PersonalEvent; // if provided → edit mode
  onSaved?: () => void;
}

export function PersonalEventDialog({
  open,
  onOpenChange,
  defaultDate,
  event,
  onSaved,
}: PersonalEventDialogProps) {
  const isEditing = !!event;
  const [isPending, startTransition] = useTransition();

  const form = useForm<PersonalEventFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(personalEventFormSchema) as any,
    defaultValues: {
      title: "",
      start_date: defaultDate ?? "",
      end_date: defaultDate ?? "",
      all_day: true,
      start_time: null,
      end_time: null,
      tag: null,
      color: "#6366f1",
      notes: null,
    },
  });

  // Reset when the dialog opens with new data
  useEffect(() => {
    if (open) {
      form.reset(
        event
          ? {
              title: event.title,
              start_date: event.start_date,
              end_date: event.end_date,
              all_day: event.all_day,
              start_time: event.start_time,
              end_time: event.end_time,
              tag: event.tag,
              color: event.color,
              notes: event.notes,
            }
          : {
              title: "",
              start_date: defaultDate ?? "",
              end_date: defaultDate ?? "",
              all_day: true,
              start_time: null,
              end_time: null,
              tag: null,
              color: "#6366f1",
              notes: null,
            }
      );
    }
  }, [open, event, defaultDate, form]);

  const allDay = form.watch("all_day");
  const selectedColor = form.watch("color");

  function onSubmit(values: PersonalEventFormValues) {
    startTransition(async () => {
      if (isEditing && event) {
        await updatePersonalEvent(event.id, values);
      } else {
        await createPersonalEvent(values);
      }
      onOpenChange(false);
      onSaved?.();
    });
  }

  function handleDelete() {
    if (!event) return;
    startTransition(async () => {
      await deletePersonalEvent(event.id);
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit event" : "New personal event"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? "Edit the details of your personal event." : "Fill in the details for your new personal event."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="pe-title">Title</Label>
            <Input
              id="pe-title"
              {...form.register("title")}
              placeholder="e.g. Summer vacation"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pe-start">Start date</Label>
              <Input id="pe-start" type="date" {...form.register("start_date")} />
              {form.formState.errors.start_date && (
                <p className="text-xs text-destructive">{form.formState.errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pe-end">End date</Label>
              <Input id="pe-end" type="date" {...form.register("end_date")} />
            </div>
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="pe-allday"
              checked={allDay}
              onCheckedChange={(v) => form.setValue("all_day", !!v)}
            />
            <Label htmlFor="pe-allday" className="cursor-pointer">All day</Label>
          </div>

          {/* Times — only when not all-day */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pe-start-time">Start time</Label>
                <Input
                  id="pe-start-time"
                  type="time"
                  {...form.register("start_time")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe-end-time">End time</Label>
                <Input
                  id="pe-end-time"
                  type="time"
                  {...form.register("end_time")}
                />
              </div>
            </div>
          )}

          {/* Tag */}
          <div className="space-y-1.5">
            <Label htmlFor="pe-tag">Tag <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="pe-tag"
              {...form.register("tag")}
              placeholder="e.g. Vacation, Travel, Admin"
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => form.setValue("color", c)}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: selectedColor === c ? "black" : "transparent",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="pe-notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="pe-notes"
              {...form.register("notes")}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive mr-auto"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
