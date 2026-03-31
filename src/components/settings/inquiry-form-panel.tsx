"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { updateInquirySettings } from "@/lib/actions/inquiries";
import {
  inquirySettingsSchema,
  type InquirySettingsValues,
} from "@/lib/types/forms";
import { Copy, Link2 } from "lucide-react";

interface InquiryFormPanelProps {
  defaultValues: InquirySettingsValues;
}

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://focal.app";

const FIELD_TOGGLES: Array<{
  name: keyof InquirySettingsValues;
  label: string;
}> = [
  { name: "inquiry_show_phone",          label: "Phone number" },
  { name: "inquiry_show_secondary_name", label: "Partner's name" },
  { name: "inquiry_show_event_date",     label: "Event date" },
  { name: "inquiry_show_venue",          label: "Venue" },
  { name: "inquiry_show_location",       label: "Location / city" },
  { name: "inquiry_show_notes",          label: "Additional notes" },
];

export function InquiryFormPanel({ defaultValues }: InquiryFormPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<"url" | "embed" | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InquirySettingsValues>({
    resolver: zodResolver(inquirySettingsSchema),
    defaultValues,
  });

  const slug = watch("slug");
  const formEnabled = watch("inquiry_form_enabled");
  const showPackages = watch("inquiry_show_packages");

  const publicUrl =
    slug && slug.length >= 3
      ? `${APP_URL}/inquiry/${slug}`
      : null;

  const embedSnippet = publicUrl
    ? `<iframe src="${publicUrl}" width="100%" height="700" frameborder="0" title="Photography inquiry form"></iframe>`
    : null;

  function copyToClipboard(text: string, type: "url" | "embed") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function onSubmit(values: InquirySettingsValues) {
    setSaveError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateInquirySettings(values);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(result.error ?? "Failed to save.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Inquiry Form</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share a link or embed a form so clients can send inquiries directly into your CRM.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Enable toggle ── */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="inquiry_form_enabled" className="text-sm font-medium">
                Enable inquiry form
              </Label>
              <p className="text-xs text-muted-foreground">
                When off, your form URL will return a &ldquo;not available&rdquo; page.
              </p>
            </div>
            <Controller
              control={control}
              name="inquiry_form_enabled"
              render={({ field }) => (
                <Switch
                  id="inquiry_form_enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <Separator />

          {/* ── Slug ── */}
          <div className="space-y-1.5">
            <Label htmlFor="slug">Your form URL slug</Label>
            <div className="flex gap-2">
              <span className="flex items-center text-sm text-muted-foreground bg-muted px-3 rounded-l-md border border-r-0 border-input whitespace-nowrap">
                focal.app/inquiry/
              </span>
              <Input
                id="slug"
                {...register("slug")}
                placeholder="your-name"
                className="rounded-l-none"
              />
            </div>
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>

          {/* ── URL + embed share ── */}
          {publicUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {publicUrl}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs shrink-0"
                  onClick={() => copyToClipboard(publicUrl, "url")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copied === "url" ? "Copied!" : "Copy link"}
                </Button>
              </div>

              {embedSnippet && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => copyToClipboard(embedSnippet, "embed")}
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  {copied === "embed" ? "Copied!" : "Copy embed code for your website"}
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* ── Field visibility ── */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Show on form</p>
            <div className="space-y-3">
              {FIELD_TOGGLES.map(({ name, label }) => (
                <div key={name} className="flex items-center justify-between">
                  <Label htmlFor={name} className="text-sm font-normal text-muted-foreground cursor-pointer">
                    {label}
                  </Label>
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <Switch
                        id={name}
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              ))}

              {/* Package select (with nested price toggle) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inquiry_show_packages" className="text-sm font-normal text-muted-foreground cursor-pointer">
                    Package selection
                  </Label>
                  <Controller
                    control={control}
                    name="inquiry_show_packages"
                    render={({ field }) => (
                      <Switch
                        id="inquiry_show_packages"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {showPackages && (
                  <div className="flex items-center justify-between pl-4">
                    <Label htmlFor="inquiry_show_prices" className="text-xs font-normal text-muted-foreground/70 cursor-pointer">
                      Show prices in package list
                    </Label>
                    <Controller
                      control={control}
                      name="inquiry_show_prices"
                      render={({ field }) => (
                        <Switch
                          id="inquiry_show_prices"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {saveError}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
