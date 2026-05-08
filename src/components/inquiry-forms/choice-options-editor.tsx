"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import type { InquiryFormFieldOption } from "@/lib/types/inquiry-forms";

interface Props {
  options: InquiryFormFieldOption[];
  onChange: (options: InquiryFormFieldOption[]) => void;
}

export function ChoiceOptionsEditor({ options, onChange }: Props) {
  function addOption() {
    onChange([
      ...options,
      { id: `new-${Date.now()}`, field_id: "", label: "", sort_order: options.length },
    ]);
  }

  function updateLabel(index: number, label: string) {
    onChange(options.map((o, i) => i === index ? { ...o, label } : o));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <Input
            value={opt.label}
            onChange={(e) => updateLabel(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="h-8 text-sm"
          />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeOption(i)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addOption} className="w-full text-xs">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add option
      </Button>
    </div>
  );
}
