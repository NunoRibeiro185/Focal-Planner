"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { packageFormSchema, type PackageFormValues } from "@/lib/types/forms";
import { createCustomField } from "@/lib/actions/custom-fields";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import type { CustomFieldDefinition } from "@/lib/types";

interface PackageFormProps {
  defaultValues?: Partial<PackageFormValues>;
  onSubmit: (values: PackageFormValues) => Promise<void>;
  submitLabel?: string;
  /** Version number to display as read-only info when editing */
  currentVersionNumber?: number;
  /** Active custom field definitions to render as deliverables */
  customFieldDefinitions?: CustomFieldDefinition[];
}

export function PackageForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save Package",
  currentVersionNumber,
  customFieldDefinitions = [],
}: PackageFormProps) {
  const [pending, setPending] = useState(false);
  const [localDefinitions, setLocalDefinitions] = useState<CustomFieldDefinition[]>(customFieldDefinitions);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"checkbox" | "text">("checkbox");
  const [addingField, setAddingField] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackageFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(packageFormSchema) as any,
    defaultValues: {
      name: "",
      description: null,
      base_price: 0,
      currency: "EUR",
      hours_of_coverage: 8,
      custom_fields: customFieldDefinitions.map((f) => ({
        field_definition_id: f.id,
        value_text: null,
        value_bool: null,
      })),
      ...defaultValues,
    },
  });

  const currency = watch("currency");
  const customFields = watch("custom_fields");

  async function handleAddField() {
    const label = newLabel.trim();
    if (!label) return;
    setAddingField(true);
    try {
      const newDef = await createCustomField({ label, field_type: newType });
      const typedDef = newDef as CustomFieldDefinition;
      setLocalDefinitions((prev) => [...prev, typedDef]);
      setValue("custom_fields", [
        ...(customFields ?? []),
        { field_definition_id: typedDef.id, value_text: null, value_bool: null },
      ]);
      setNewLabel("");
      setNewType("checkbox");
    } finally {
      setAddingField(false);
    }
  }

  async function handleFormSubmit(values: PackageFormValues) {
    setPending(true);
    try {
      await onSubmit(values);
    } catch {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-lg">
      {/* Version badge */}
      {currentVersionNumber !== undefined && (
        <p className="text-sm text-muted-foreground">
          Saving will create{" "}
          <span className="font-medium">v{currentVersionNumber + 1}</span>.
          Existing bookings will keep their current snapshot.
        </p>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Package name</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Gold Package" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe what this package includes…"
          rows={3}
        />
      </div>

      {/* Price + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="base_price">Base price</Label>
          <Input
            id="base_price"
            type="number"
            step="0.01"
            min="0"
            {...register("base_price")}
          />
          {errors.base_price && (
            <p className="text-sm text-destructive">{errors.base_price.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setValue("currency", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hours */}
      <div className="space-y-1.5">
        <Label htmlFor="hours_of_coverage">Hours of coverage</Label>
        <Input
          id="hours_of_coverage"
          type="number"
          step="0.5"
          min="0.5"
          max="24"
          {...register("hours_of_coverage")}
        />
        {errors.hours_of_coverage && (
          <p className="text-sm text-destructive">{errors.hours_of_coverage.message}</p>
        )}
      </div>

      <Separator />

      {/* Deliverables (custom fields) */}
      <p className="text-sm font-medium">Deliverables</p>

      <div className="space-y-3">
        {localDefinitions.map((field, index) => (
          <div key={field.id}>
            {field.field_type === "checkbox" ? (
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={!!watch(`custom_fields.${index}.value_bool`)}
                  onCheckedChange={(checked) =>
                    setValue(`custom_fields.${index}.value_bool`, !!checked)
                  }
                />
                <span className="text-sm">{field.label}</span>
              </label>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`cf-${field.id}`}>{field.label}</Label>
                <Input
                  id={`cf-${field.id}`}
                  {...register(`custom_fields.${index}.value_text`)}
                />
              </div>
            )}
          </div>
        ))}

        {/* Inline add-field row */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="New deliverable…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddField();
              }
            }}
            className="h-8 text-sm"
          />
          <Select
            value={newType}
            onValueChange={(v) => setNewType(v as "checkbox" | "text")}
          >
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            disabled={!newLabel.trim() || addingField}
            onClick={handleAddField}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {localDefinitions.length === 0 && !newLabel && (
          <p className="text-xs text-muted-foreground">
            Add deliverables that will appear as trackable checkboxes on each booking.
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
