"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskValues } from "@/lib/types/forms";
import { addBookingTask, toggleBookingTask } from "@/lib/actions/tasks";
import type { CommandCenterTask, BookingOption } from "@/lib/queries/command-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NO_BOOKING_VALUE = "__none__";

const MOTIVATIONAL_PHRASES = [
  "You're all caught up — go shoot something beautiful.",
  "No open tasks. Time to be present.",
  "Clear skies ahead. Enjoy the calm.",
];

interface CommandCenterTasksPanelProps {
  thisWeek: CommandCenterTask[];
  upcoming: CommandCenterTask[];
  bookingOptions: BookingOption[];
}

export function CommandCenterTasksPanel({
  thisWeek,
  upcoming,
  bookingOptions,
}: CommandCenterTasksPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(NO_BOOKING_VALUE);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", due_date: null },
  });

  function handleToggle(task: CommandCenterTask) {
    startTransition(async () => {
      await toggleBookingTask(task.id, true, task.booking_id);
    });
  }

  function handleAddTask(values: TaskValues) {
    const bookingId =
      selectedBookingId === NO_BOOKING_VALUE ? null : selectedBookingId;
    startTransition(async () => {
      await addBookingTask(bookingId, values);
      reset();
      setSelectedBookingId(NO_BOOKING_VALUE);
      setShowAddForm(false);
    });
  }

  const isEmpty = thisWeek.length === 0 && upcoming.length === 0;
  const [phrase, setPhrase] = useState(MOTIVATIONAL_PHRASES[0]);
  useEffect(() => {
    setPhrase(MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tasks
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {isEmpty && !showAddForm ? (
          <p className="text-sm text-muted-foreground py-2">{phrase}</p>
        ) : (
          <>
            {/* This week — full size, interactive */}
            {thisWeek.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={handleToggle}
                disabled={isPending}
              />
            ))}

            {/* Upcoming — dimmed */}
            {upcoming.length > 0 && (
              <>
                {thisWeek.length > 0 && (
                  <p className="text-xs text-muted-foreground px-3 pt-2 pb-1 uppercase tracking-wide">
                    Coming up
                  </p>
                )}
                {upcoming.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    disabled={isPending}
                    dimmed
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Add task form */}
        {showAddForm ? (
          <form
            onSubmit={handleSubmit(handleAddTask)}
            className="space-y-2 pt-2"
          >
            <Input
              placeholder="Task title"
              {...register("title")}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                className="h-8 text-xs"
                {...register("due_date")}
              />
              <Select
                value={selectedBookingId}
                onValueChange={setSelectedBookingId}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Assign to booking…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BOOKING_VALUE}>
                    General (no booking)
                  </SelectItem>
                  {bookingOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  reset();
                  setSelectedBookingId(NO_BOOKING_VALUE);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface TaskRowProps {
  task: CommandCenterTask;
  onToggle: (task: CommandCenterTask) => void;
  disabled: boolean;
  dimmed?: boolean;
}

function TaskRow({ task, onToggle, disabled, dimmed }: TaskRowProps) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
        dimmed ? "opacity-50 hover:opacity-100" : "hover:bg-muted/40"
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={() => onToggle(task)}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", dimmed && "text-xs")}>
          {task.title}
        </p>
        {task.booking_client && (
          <p className="text-xs text-muted-foreground truncate">
            {task.booking_client}
          </p>
        )}
      </div>
      {task.due_date && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          {format(new Date(task.due_date), "d MMM")}
        </span>
      )}
    </div>
  );

  // Booking tasks link to their booking; general tasks are not clickable
  if (task.booking_id) {
    return (
      <Link key={task.id} href={`/bookings/${task.booking_id}`}>
        {inner}
      </Link>
    );
  }

  return <div key={task.id}>{inner}</div>;
}
