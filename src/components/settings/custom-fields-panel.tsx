"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomField,
  softDeleteCustomField,
} from "@/lib/actions/custom-fields";
import type { CustomFieldDefinition } from "@/lib/types";

interface CustomFieldsPanelProps {
  fields: CustomFieldDefinition[];
}

export function CustomFieldsPanel({ fields }: CustomFieldsPanelProps) {
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<"checkbox" | "text">("text");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createCustomField({ label: label.trim(), field_type: fieldType });
      setLabel("");
      setFieldType("text");
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      await softDeleteCustomField(fieldId);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
        Custom package fields
      </p>
      <p className="text-sm text-muted-foreground">
        Fields added here appear on every new package. Packages you&apos;ve already created won&apos;t change.
      </p>

      {fields.length > 0 && (
        <ul className="space-y-2">
          {fields.map((field) => (
            <li
              key={field.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {field.label}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({field.field_type})
                </span>
              </span>
              <button
                onClick={() => handleDelete(field.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                aria-label={`Delete ${field.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="space-y-1.5">
          <Label htmlFor="cf-label">New field label</Label>
          <Input
            id="cf-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Drone footage included"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Field type</Label>
          <Select
            value={fieldType}
            onValueChange={(v) => setFieldType(v as "checkbox" | "text")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="checkbox">Checkbox (yes/no)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAdd}
          disabled={isPending}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add field
        </Button>
      </div>
    </div>
  );
}
