"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsValues } from "@/lib/types/forms";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { updateSettings, checkPhotographerSlug } from "@/lib/actions/settings";
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
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface SettingsFormProps {
  defaultValues: SettingsValues;
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  const currency = watch("default_currency");
  const slugValue = watch("slug");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = slugValue?.trim() ?? "";

    // If unchanged from default, no need to check
    if (trimmed === defaultValues.slug) {
      setSlugStatus("idle");
      return;
    }

    if (!trimmed || trimmed.length < 3) {
      setSlugStatus(trimmed.length > 0 ? "invalid" : "idle");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      setSlugStatus("invalid");
      return;
    }

    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const { available } = await checkPhotographerSlug(trimmed);
      setSlugStatus(available ? "available" : "taken");
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slugValue, defaultValues.slug]);

  async function onSubmit(values: SettingsValues) {
    if (slugStatus === "taken") {
      setSaveError("That URL is already taken. Please choose another.");
      return;
    }
    setSaveError(null);
    setPending(true);
    const result = await updateSettings(values);
    setPending(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(result.error ?? "Failed to save.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Display name</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Default currency</Label>
        <Select
          value={currency}
          onValueChange={(v) => setValue("default_currency", v)}
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

      <div className="space-y-1.5">
        <Label htmlFor="slug">Your inquiry URL</Label>
        <div className="flex items-center gap-0">
          <span className="flex items-center h-9 px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md whitespace-nowrap">
            /inquiry/
          </span>
          <div className="relative flex-1">
            <Input
              id="slug"
              {...register("slug")}
              placeholder="your-name"
              className="rounded-l-none pr-8"
              autoComplete="off"
            />
            {slugStatus !== "idle" && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {slugStatus === "taken" && <XCircle className="h-4 w-4 text-destructive" />}
                {slugStatus === "invalid" && <XCircle className="h-4 w-4 text-muted-foreground" />}
              </span>
            )}
          </div>
        </div>
        {slugStatus === "taken" && (
          <p className="text-xs text-destructive">That URL is already taken.</p>
        )}
        {slugStatus === "available" && (
          <p className="text-xs text-green-600">Available!</p>
        )}
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Clients use this to access your inquiry forms:{" "}
          <span className="font-mono">/inquiry/{slugValue || "your-name"}/…</span>
        </p>
      </div>

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <Button type="submit" disabled={pending || slugStatus === "taken" || slugStatus === "checking"}>
        {saved ? "Saved!" : pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
