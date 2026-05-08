"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChoiceOptionsEditor } from "./choice-options-editor";
import type { InquiryFormField } from "@/lib/types/inquiry-forms";

const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  number: "Number",
  date: "Date",
};

interface Props {
  field: InquiryFormField;
  onUpdate: (update: Partial<InquiryFormField>) => void;
  onRemove: () => void;
}

export function FieldCard({ field, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isChoiceField = field.field_type === "single_choice" || field.field_type === "multiple_choice";

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border bg-card">
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Drag to reorder">
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
          {field.field_mapping ? "Pre-made" : (FIELD_TYPE_LABELS[field.field_type] ?? field.field_type)}
        </span>

        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="flex-1 h-8 text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent px-1"
          placeholder="Field label"
        />

        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={field.is_required}
            onCheckedChange={(v) => onUpdate({ is_required: v })}
            aria-label="Required"
          />
          <span className="text-xs text-muted-foreground">Req</span>
        </div>

        {isChoiceField && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand options"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onRemove}
          aria-label="Remove field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Helper text */}
      <div className="px-3 pb-2 ml-7">
        <Input
          value={field.helper_text ?? ""}
          onChange={(e) => onUpdate({ helper_text: e.target.value || null })}
          className="h-7 text-xs text-muted-foreground border-0 shadow-none focus-visible:ring-0 bg-transparent px-1"
          placeholder="Helper text (optional)"
        />
      </div>

      {/* Choice options */}
      {isChoiceField && expanded && (
        <div className="px-3 pb-3 ml-7 pt-1 border-t">
          <ChoiceOptionsEditor
            options={field.options}
            onChange={(options) => onUpdate({ options })}
          />
        </div>
      )}
    </div>
  );
}
