"use client";

import { useState, useTransition, useEffect } from "react";
import { GripVertical, Trash2, Plus, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  toggleBookingEditingStage,
  addBookingEditingStage,
  deleteBookingEditingStage,
  reorderBookingEditingStage,
} from "@/lib/actions/editing-stages";
import type { BookingEditingStage } from "@/lib/types";
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
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

interface EditingPipelinePanelProps {
  stages: BookingEditingStage[];
  bookingId: string;
  hasTemplates: boolean;
}

function SortableStageRow({
  stage,
  bookingId,
  isPending,
  onToggle,
  onDelete,
}: {
  stage: BookingEditingStage;
  bookingId: string;
  isPending: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isComplete = stage.completed_at !== null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border px-3 py-2.5 bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(stage.id, !isComplete)}
        disabled={isPending}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          isComplete
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary"
        )}
        aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
      >
        {isComplete && <Check className="h-3 w-3" />}
      </button>

      <span
        className={cn(
          "flex-1 text-sm",
          isComplete && "line-through text-muted-foreground"
        )}
      >
        {stage.title}
      </span>

      <button
        type="button"
        onClick={() => onDelete(stage.id)}
        disabled={isPending}
        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 shrink-0"
        aria-label={`Delete ${stage.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

export function EditingPipelinePanel({
  stages: initialStages,
  bookingId,
  hasTemplates,
}: EditingPipelinePanelProps) {
  const [stages, setStages] = useState(initialStages);
  const [newTitle, setNewTitle] = useState("");

  // Sync server-rendered props into local state after revalidation
  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const completed = stages.filter((s) => s.completed_at !== null).length;
  const progress =
    stages.length > 0 ? Math.round((completed / stages.length) * 100) : 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleToggle(stageId: string, complete: boolean) {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? { ...s, completed_at: complete ? new Date().toISOString() : null }
          : s
      )
    );
    startTransition(async () => {
      await toggleBookingEditingStage(stageId, complete, bookingId);
    });
  }

  function handleDelete(stageId: string) {
    setStages((prev) => prev.filter((s) => s.id !== stageId));
    startTransition(async () => {
      await deleteBookingEditingStage(stageId, bookingId);
    });
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await addBookingEditingStage(bookingId, newTitle.trim());
      setNewTitle("");
      setShowAdd(false);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(stages, oldIndex, newIndex);
    setStages(reordered);

    startTransition(async () => {
      await Promise.all(
        reordered.map((s, i) =>
          reorderBookingEditingStage(s.id, (i + 1) * 10, bookingId)
        )
      );
    });
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Editing Pipeline
          </CardTitle>
          <span className="text-sm font-bold tabular-nums text-primary">
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {stages.length === 0 && !hasTemplates && (
          <p className="text-sm text-muted-foreground">
            No editing stages configured.{" "}
            <Link href="/settings" className="text-primary hover:underline">
              Set up your workflow in Settings →
            </Link>
          </p>
        )}

        {stages.length === 0 && hasTemplates && (
          <p className="text-sm text-muted-foreground">
            No stages for this booking yet. Add one below.
          </p>
        )}

        {stages.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    bookingId={bookingId}
                    isPending={isPending}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {/* Add stage */}
        {showAdd ? (
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Stage name…"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAdd(false);
              }}
              autoFocus
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleAdd} disabled={isPending}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-4 w-4" />
            Add stage
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
