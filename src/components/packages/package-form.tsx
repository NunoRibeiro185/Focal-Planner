"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { packageFormSchema, type PackageFormValues } from "@/lib/types/forms";
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
import Link from "next/link";
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

      <div className="space-y-0.5">
        <p className="text-sm font-semibold">Deliverables</p>
        <p className="text-xs text-muted-foreground">
          Select which deliverables are included in this package. Each checked item appears as a trackable field on every booking.
        </p>
      </div>

      <div className="space-y-3">
        {customFieldDefinitions.map((field, index) => (
          <div key={field.id}>
            {field.field_type === "checkbox" ? (
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={!!customFields?.[index]?.value_bool}
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

        {customFieldDefinitions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No deliverables defined yet.{" "}
            <Link
              href="/packages?tab=deliverables"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Go to Deliverables
            </Link>{" "}
            to add them, then come back here.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">
            Need to add or remove deliverable types?{" "}
            <Link
              href="/packages?tab=deliverables"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Manage deliverables
            </Link>
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
