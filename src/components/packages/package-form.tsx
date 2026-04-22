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
  isNewVersion?: boolean;
  customFieldDefinitions?: CustomFieldDefinition[];
}

export function PackageForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save Package",
  isNewVersion = false,
  customFieldDefinitions = [],
}: PackageFormProps) {
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      version_name: "",
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
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-lg">

      {/* Package name — primary identity, always first */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Package name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g. Gold Package"
          autoFocus={!defaultValues?.name}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Version name — subordinate to package, with explanation */}
      <div className="space-y-1.5">
        <Label htmlFor="version_name">
          Version name
          {isNewVersion && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              e.g. Summer 25, Base Winter, Elopement
            </span>
          )}
        </Label>
        <Input
          id="version_name"
          {...register("version_name")}
          placeholder={isNewVersion ? "Name this version…" : "e.g. Summer 25"}
          className={isNewVersion ? "text-base font-medium" : ""}
          autoFocus={!!defaultValues?.name}
        />
        <p className="text-xs text-muted-foreground">
          Versions let you update pricing each season — existing bookings stay locked to their original version.
        </p>
        {errors.version_name && (
          <p className="text-sm text-destructive">{errors.version_name.message}</p>
        )}
      </div>

      <Separator />

      {/* Description — client-facing pitch, not a deliverables list */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="A relaxed afternoon from first look through golden hour portraits…"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Appears on client proposals — write it like you&apos;d introduce the package to a couple. Use deliverables below for the specifics.
        </p>
      </div>

      {/* Price + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="base_price">Base price</Label>
          <Input
            id="base_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="e.g. 1500"
            {...register("base_price")}
          />
          {errors.base_price && (
            <p className="text-sm text-destructive">{errors.base_price.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setValue("currency", v)}
          >
            <SelectTrigger id="currency">
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
          placeholder="e.g. 8"
          {...register("hours_of_coverage")}
        />
        {errors.hours_of_coverage && (
          <p className="text-sm text-destructive">{errors.hours_of_coverage.message}</p>
        )}
      </div>

      <Separator />

      {/* Deliverables — proper section heading with persistent explanation */}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">Deliverables</p>
        <p className="text-xs text-muted-foreground">
          Each item appears as a trackable checkbox on every booking that uses this package.
        </p>
      </div>

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

        {/* Add deliverable row */}
        <div className="flex items-center gap-2 pt-1">
          <label htmlFor="new-deliverable" className="sr-only">New deliverable name</label>
          <Input
            id="new-deliverable"
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
            <SelectTrigger className="h-8 w-32 text-sm" aria-label="Deliverable type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkbox">
                <span>Checkbox</span>
              </SelectItem>
              <SelectItem value="text">
                <span>Text field</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-sm gap-1"
            disabled={!newLabel.trim() || addingField}
            onClick={handleAddField}
            aria-label="Add deliverable"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {localDefinitions.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No deliverables yet — add items above.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <a
          href="/packages"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </a>
        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}
      </div>
    </form>
  );
}
