"use client";

import { Plus } from "lucide-react";
import type { InquiryFieldType, InquiryFieldMapping } from "@/lib/types/inquiry-forms";

const PRE_MADE_FIELDS = [
  { label: "Partner's name", fieldMapping: "client_name_secondary" as InquiryFieldMapping, fieldType: "short_text" as InquiryFieldType },
  { label: "Phone number", fieldMapping: "client_phone" as InquiryFieldMapping, fieldType: "short_text" as InquiryFieldType },
  { label: "Event date", fieldMapping: "event_date" as InquiryFieldMapping, fieldType: "date" as InquiryFieldType },
  { label: "Venue name", fieldMapping: "venue_name" as InquiryFieldMapping, fieldType: "short_text" as InquiryFieldType },
  { label: "Venue address", fieldMapping: "venue_address" as InquiryFieldMapping, fieldType: "short_text" as InquiryFieldType },
  { label: "Location / city", fieldMapping: "location" as InquiryFieldMapping, fieldType: "short_text" as InquiryFieldType },
  { label: "Additional notes", fieldMapping: "notes" as InquiryFieldMapping, fieldType: "long_text" as InquiryFieldType },
  { label: "Package", fieldMapping: "package_template_id" as InquiryFieldMapping, fieldType: "short_text" as InquiryFieldType },
] as const;

const FREEFORM_FIELDS = [
  { label: "Short text", fieldType: "short_text" as InquiryFieldType },
  { label: "Long text", fieldType: "long_text" as InquiryFieldType },
  { label: "Single choice", fieldType: "single_choice" as InquiryFieldType },
  { label: "Multiple choice", fieldType: "multiple_choice" as InquiryFieldType },
  { label: "Number", fieldType: "number" as InquiryFieldType },
  { label: "Date", fieldType: "date" as InquiryFieldType },
] as const;

interface Props {
  existingMappings: Set<InquiryFieldMapping>;
  onAdd: (fieldType: InquiryFieldType, fieldMapping?: InquiryFieldMapping) => void;
}

export function FieldPalette({ existingMappings, onAdd }: Props) {
  const availablePreMade = PRE_MADE_FIELDS.filter((f) => !existingMappings.has(f.fieldMapping));

  return (
    <div className="space-y-5">
      {availablePreMade.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pre-made</p>
          <div className="space-y-0.5">
            {availablePreMade.map((f) => (
              <button
                key={f.fieldMapping}
                type="button"
                onClick={() => onAdd(f.fieldType, f.fieldMapping)}
                className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custom</p>
        <div className="space-y-0.5">
          {FREEFORM_FIELDS.map((f) => (
            <button
              key={f.fieldType}
              type="button"
              onClick={() => onAdd(f.fieldType)}
              className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
