"use client";

import { useState, useTransition, useEffect } from "react";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addEditingStageTemplate,
  deleteEditingStageTemplate,
  reorderEditingStageTemplate,
} from "@/lib/actions/editing-stages";
import type { EditingStageTemplate } from "@/lib/types";
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

interface EditingWorkflowPanelProps {
  stages: EditingStageTemplate[];
}

function SortableStage({
  stage,
  onDelete,
  isPending,
}: {
  stage: EditingStageTemplate;
  onDelete: (id: string) => void;
  isPending: boolean;
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1">{stage.title}</span>
      <button
        type="button"
        onClick={() => onDelete(stage.id)}
        disabled={isPending}
        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        aria-label={`Delete ${stage.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export function EditingWorkflowPanel({
  stages: initialStages,
}: EditingWorkflowPanelProps) {
  const [stages, setStages] = useState(initialStages);
  const [title, setTitle] = useState("");

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleAdd() {
    if (!title.trim()) {
      setError("Stage name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      await addEditingStageTemplate(title.trim());
      setTitle("");
    });
  }

  function handleDelete(stageId: string) {
    startTransition(async () => {
      await deleteEditingStageTemplate(stageId);
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
          reorderEditingStageTemplate(s.id, (i + 1) * 10)
        )
      );
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
        Editing workflow
      </p>
      <p className="text-sm text-muted-foreground">
        Define your post-production stages. These are copied to each booking
        when it moves to{" "}
        <span className="font-medium text-foreground">Editing</span> status.
      </p>

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
                <SortableStage
                  key={stage.id}
                  stage={stage}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="space-y-1.5">
          <Label htmlFor="stage-title">New stage</Label>
          <Input
            id="stage-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Culling, Color Grade…"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={isPending}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add stage
        </Button>
      </div>
    </div>
  );
}
