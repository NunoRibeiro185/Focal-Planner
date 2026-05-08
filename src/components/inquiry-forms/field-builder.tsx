"use client";

import { useId } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { FieldCard } from "./field-card";
import { FieldPalette } from "./field-palette";
import type { InquiryFormField, InquiryFieldType, InquiryFieldMapping } from "@/lib/types/inquiry-forms";

interface Props {
  fields: InquiryFormField[];
  onChange: (fields: InquiryFormField[]) => void;
}

export function FieldBuilder({ fields, onChange }: Props) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    onChange(arrayMove(fields, oldIndex, newIndex));
  }

  function handleAdd(fieldType: InquiryFieldType, fieldMapping?: InquiryFieldMapping) {
    const newField: InquiryFormField = {
      id: crypto.randomUUID(),
      form_id: "",
      photographer_id: "",
      field_type: fieldType,
      label: fieldMapping ? defaultLabelForMapping(fieldMapping) : defaultLabelForType(fieldType),
      helper_text: null,
      is_required: false,
      sort_order: fields.length,
      field_mapping: fieldMapping ?? null,
      options: [],
    };
    onChange([...fields, newField]);
  }

  function handleUpdate(id: string, update: Partial<InquiryFormField>) {
    onChange(fields.map((f) => f.id === id ? { ...f, ...update } : f));
  }

  function handleRemove(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  const existingMappings = new Set(fields.map((f) => f.field_mapping).filter(Boolean) as InquiryFieldMapping[]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Form fields</h3>
      <p className="text-xs text-muted-foreground">Name and email are always collected. Add fields below.</p>

      {fields.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} id={dndId} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  onUpdate={(u) => handleUpdate(field.id, u)}
                  onRemove={() => handleRemove(field.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {fields.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No fields yet. Add fields from the palette below.
        </div>
      )}

      <FieldPalette existingMappings={existingMappings} onAdd={handleAdd} />
    </div>
  );
}

function defaultLabelForMapping(mapping: InquiryFieldMapping): string {
  const labels: Record<InquiryFieldMapping, string> = {
    client_name_secondary: "Partner's name",
    client_phone: "Phone number",
    event_date: "Event date",
    venue_name: "Venue name",
    venue_address: "Venue address",
    location: "Location / city",
    notes: "Anything else?",
    package_template_id: "Package",
  };
  return labels[mapping];
}

function defaultLabelForType(type: InquiryFieldType): string {
  const labels: Record<InquiryFieldType, string> = {
    short_text: "Short answer",
    long_text: "Long answer",
    single_choice: "Single choice",
    multiple_choice: "Multiple choice",
    number: "Number",
    date: "Date",
  };
  return labels[type];
}
