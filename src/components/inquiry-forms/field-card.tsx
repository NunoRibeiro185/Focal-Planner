"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChoiceOptionsEditor } from "./choice-options-editor";
import type { InquiryFormField } from "@/lib/types/inquiry-forms";

interface Props {
  field: InquiryFormField;
  packageTemplates: { id: string; name: string }[];
  allowedPackageIds: string[];
  onUpdate: (update: Partial<InquiryFormField>) => void;
  onRemove: () => void;
}

export function FieldCard({ field, packageTemplates, allowedPackageIds, onUpdate, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isChoice = field.field_type === "single_choice" || field.field_type === "multiple_choice";

  const visiblePackages = allowedPackageIds.length > 0
    ? packageTemplates.filter((p) => allowedPackageIds.includes(p.id))
    : packageTemplates;

  return (
    <div ref={setNodeRef} style={style} className="group rounded-xl border bg-card">
      <div className="p-4 space-y-2">
        {/* Label row */}
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab shrink-0 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-muted-foreground/40 min-w-0 leading-normal py-0.5"
            placeholder="Field label"
          />

          {field.is_required && (
            <span className="text-destructive text-sm shrink-0">*</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground/30 hover:text-destructive shrink-0"
            onClick={onRemove}
            aria-label="Remove field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Helper text */}
        <input
          value={field.helper_text ?? ""}
          onChange={(e) => onUpdate({ helper_text: e.target.value || null })}
          placeholder="Add hint text (optional)"
          className="w-full pl-6 text-xs text-muted-foreground bg-transparent outline-none placeholder:text-muted-foreground/30"
        />

        {/* Form control */}
        <div className="pl-6">
          {field.field_mapping === "package_template_id" ? (
            visiblePackages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No packages — select some in the settings panel.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {visiblePackages.map((pkg) => (
                  <div key={pkg.id} className="rounded-lg border border-border p-3 opacity-60">
                    <p className="text-sm font-medium">{pkg.name}</p>
                  </div>
                ))}
              </div>
            )
          ) : field.field_type === "long_text" ? (
            <Textarea disabled rows={3} className="opacity-50 resize-none" />
          ) : isChoice ? (
            <div className="space-y-2">
              {field.options.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No options yet.</p>
              ) : (
                field.options.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 opacity-60">
                    {field.field_type === "single_choice" ? (
                      <input type="radio" disabled className="accent-primary" />
                    ) : (
                      <Checkbox disabled />
                    )}
                    <span className="text-sm">{opt.label || <em className="text-muted-foreground">Untitled option</em>}</span>
                  </label>
                ))
              )}
              <div className="pt-1">
                <ChoiceOptionsEditor
                  options={field.options}
                  onChange={(options) => onUpdate({ options })}
                />
              </div>
            </div>
          ) : (
            <Input
              disabled
              type={field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : "text"}
              className="opacity-50"
            />
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="px-4 py-2 border-t bg-muted/20 rounded-b-xl flex items-center gap-2">
        <Switch
          checked={field.is_required}
          onCheckedChange={(v) => onUpdate({ is_required: v })}
          aria-label="Required"
        />
        <span className="text-xs text-muted-foreground">Required</span>
      </div>
    </div>
  );
}
