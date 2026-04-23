"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsValues } from "@/lib/types/forms";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { updateSettings } from "@/lib/actions/settings";
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

interface SettingsFormProps {
  defaultValues: SettingsValues;
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

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

  async function onSubmit(values: SettingsValues) {
    setPending(true);
    await updateSettings(values);
    setSaved(true);
    setPending(false);
    setTimeout(() => setSaved(false), 3000);
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

      <Button type="submit" disabled={pending}>
        {saved ? "Saved!" : pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
