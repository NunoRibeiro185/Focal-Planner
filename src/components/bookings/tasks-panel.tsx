"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addBookingTask,
  toggleBookingTask,
  deleteBookingTask,
  reorderBookingTask,
  updateBookingTask,
} from "@/lib/actions/tasks";
import { taskSchema, type TaskValues } from "@/lib/types/forms";
import type { BookingTask } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Trash2, Plus, GripVertical, Clock, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TasksPanelProps {
  tasks: BookingTask[];
  bookingId: string;
}

export function TasksPanel({ tasks, bookingId }: TasksPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", due_date: null },
  });

  const doneTasks = tasks.filter((t) => t.done);
  const pendingTasks = tasks.filter((t) => !t.done);

  function handleAddTask(values: TaskValues) {
    startTransition(async () => {
      await addBookingTask(bookingId, values);
      reset();
      setShowAddForm(false);
    });
  }

  function handleToggle(taskId: string, done: boolean) {
    startTransition(async () => {
      await toggleBookingTask(taskId, done, bookingId);
    });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      await deleteBookingTask(taskId, bookingId);
    });
  }

  function handleUpdate(taskId: string, values: TaskValues) {
    startTransition(async () => {
      await updateBookingTask(taskId, values, bookingId);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pendingTasks.findIndex((t) => t.id === active.id);
    const newIndex = pendingTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Compute new sort_order using midpoint between neighbours
    const sorted = [...pendingTasks];
    const [moved] = sorted.splice(oldIndex, 1);
    sorted.splice(newIndex, 0, moved);

    const prevOrder = sorted[newIndex - 1]?.sort_order ?? 0;
    const nextOrder =
      sorted[newIndex + 1]?.sort_order ?? (sorted[newIndex].sort_order + 20);
    const newOrder = Math.floor((prevOrder + nextOrder) / 2);

    startTransition(async () => {
      await reorderBookingTask(String(active.id), newOrder, bookingId);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tasks
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {doneTasks.length}/{tasks.length} done
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Pending tasks (sortable) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pendingTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {pendingTasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                disabled={isPending}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Done tasks */}
        {doneTasks.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground py-1">Completed</p>
            {doneTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                disabled={isPending}
              />
            ))}
          </>
        )}

        {tasks.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground py-1">
            No tasks yet — add anything that needs to happen before or after this booking.
          </p>
        )}

        <Separator className="my-2" />

        {/* Add task form */}
        {showAddForm ? (
          <form onSubmit={handleSubmit(handleAddTask)} className="space-y-2 pt-1">
            <Input
              placeholder="Task title"
              {...register("title")}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
            <div className="flex items-center gap-2">
              <Input type="date" className="h-8 text-xs" {...register("due_date")} />
              <Button type="submit" size="sm" disabled={isPending}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
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
  task: BookingTask;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, values: TaskValues) => void;
  disabled: boolean;
  dragHandle?: React.ReactNode;
}

function TaskRow({ task, onToggle, onDelete, onUpdate, disabled, dragHandle }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDueDate, setDraftDueDate] = useState(task.due_date ?? "");

  function handleSave() {
    if (!draftTitle.trim()) return;
    onUpdate(task.id, { title: draftTitle.trim(), due_date: draftDueDate || null });
    setEditing(false);
  }

  function handleCancel() {
    setDraftTitle(task.title);
    setDraftDueDate(task.due_date ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded px-1 py-1">
        {dragHandle}
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <Input
            type="date"
            value={draftDueDate}
            onChange={(e) => setDraftDueDate(e.target.value)}
            className="h-7 text-xs w-32"
          />
          <button onClick={handleSave} disabled={disabled} className="text-primary hover:text-primary/80">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 group rounded px-1 py-1 transition-colors hover:bg-muted/40",
        task.done && "opacity-60"
      )}
    >
      {dragHandle}
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        disabled={disabled}
      />
      <span
        className={cn("flex-1 text-sm", task.done && "line-through text-muted-foreground")}
      >
        {task.title}
      </span>
      {task.due_date && !task.done && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {format(new Date(task.due_date), "d MMM")}
        </span>
      )}
      <div className="invisible group-hover:visible flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit task"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type SortableTaskRowProps = Omit<TaskRowProps, "dragHandle">;

function SortableTaskRow(props: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const dragHandle = (
    <button
      className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground touch-none"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow {...props} dragHandle={dragHandle} />
    </div>
  );
}
