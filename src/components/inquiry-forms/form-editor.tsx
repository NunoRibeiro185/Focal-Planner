"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { saveInquiryForm, checkFormUrlAvailable } from "@/lib/actions/inquiry-forms";
import { normalizeFormUrl } from "@/lib/utils/inquiry-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldBuilder } from "./field-builder";
import { FormPreview } from "./form-preview";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { InquiryFormWithFields, InquiryFormField } from "@/lib/types/inquiry-forms";

interface Props {
  form: InquiryFormWithFields | null;
  packageTemplates: { id: string; name: string }[];
  photographerSlug: string;
  onClose: () => void;
}

type UrlStatus = "idle" | "checking" | "available" | "taken";
type EditorMode = "edit" | "preview";

export function FormEditor({ form, packageTemplates, photographerSlug, onClose }: Props) {
  const [name, setName] = useState(form?.name ?? "");
  const [formUrl, setFormUrl] = useState(form?.form_url ?? "");
  const [isActive, setIsActive] = useState(form?.is_active ?? true);
  const [allowedPackageIds, setAllowedPackageIds] = useState<string[]>(form?.allowed_package_ids ?? []);
  const [fields, setFields] = useState<InquiryFormField[]>(form?.fields ?? []);
  const [isPending, startTransition] = useTransition();
  const [urlStatus, setUrlStatus] = useState<UrlStatus>("idle");
  const [mode, setMode] = useState<EditorMode>("edit");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalized = normalizeFormUrl(formUrl);

    if (!normalized || normalized === form?.form_url) {
      setUrlStatus("idle");
      return;
    }

    setUrlStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const { available } = await checkFormUrlAvailable(normalized, form?.id);
      setUrlStatus(available ? "available" : "taken");
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formUrl, form?.form_url, form?.id]);

  function handleSave() {
    if (!name.trim()) { toast.error("Form name is required."); return; }
    if (!formUrl.trim()) { toast.error("Form URL is required."); return; }
    if (urlStatus === "taken") { toast.error("That form URL is already in use."); return; }

    startTransition(async () => {
      const result = await saveInquiryForm({
        id: form?.id,
        name: name.trim(),
        form_url: formUrl,
        is_active: isActive,
        fields: fields.map((f, i) => ({ ...f, sort_order: i })),
        allowed_package_ids: allowedPackageIds,
      });
      if (result.success) {
        toast.success(form ? "Form saved." : "Form created.");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to save form.");
      }
    });
  }

  const previewUrl = photographerSlug
    ? `/inquiry/${photographerSlug}/${normalizeFormUrl(formUrl) || "…"}`
    : `/inquiry/…/${normalizeFormUrl(formUrl) || "…"}`;

  const previewPackages = allowedPackageIds.length > 0
    ? packageTemplates.filter((p) => allowedPackageIds.includes(p.id))
    : packageTemplates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-[family-name:var(--font-heading)]">
          {form ? `Edit: ${form.name}` : "New form"}
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setMode("edit")}
              className={`px-3 py-1.5 text-sm transition-colors ${mode === "edit" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Edit
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1.5 text-sm transition-colors ${mode === "preview" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Preview
            </button>
          </div>
          <Button variant="ghost" onClick={onClose}>Back to forms</Button>
        </div>
      </div>

      {mode === "preview" && (
        <FormPreview fields={fields} packageTemplates={previewPackages} />
      )}

      {mode === "edit" && (
      <>
      {/* Form metadata */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="form-name">Form name</Label>
          <Input
            id="form-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Portugal wedding inquiry"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="form-url">Form URL</Label>
          <div className="flex items-center gap-0">
            <span className="flex items-center h-9 px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md whitespace-nowrap">
              /inquiry/{photographerSlug || "…"}/
            </span>
            <div className="relative flex-1">
              <Input
                id="form-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                onBlur={(e) => setFormUrl(normalizeFormUrl(e.target.value))}
                placeholder="portugal-wedding"
                className="rounded-l-none pr-8"
                autoComplete="off"
              />
              {urlStatus !== "idle" && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {urlStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {urlStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {urlStatus === "taken" && <XCircle className="h-4 w-4 text-destructive" />}
                </span>
              )}
            </div>
          </div>
          {urlStatus === "taken" && (
            <p className="text-xs text-destructive">You already have a form with this URL.</p>
          )}
          {urlStatus === "available" && (
            <p className="text-xs text-green-600">Available!</p>
          )}
          {urlStatus === "idle" && (
            <p className="text-xs text-muted-foreground font-mono">{previewUrl}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="is-active">Active — visible to the public</Label>
        </div>

        {packageTemplates.length > 0 && (
          <div className="space-y-2">
            <Label>Restrict to packages (optional)</Label>
            <p className="text-xs text-muted-foreground">If none selected, all active packages will be available.</p>
            <div className="space-y-1.5">
              {packageTemplates.map((pkg) => (
                <label key={pkg.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowedPackageIds.includes(pkg.id)}
                    onChange={(e) => {
                      if (e.target.checked) setAllowedPackageIds((p) => [...p, pkg.id]);
                      else setAllowedPackageIds((p) => p.filter((id) => id !== pkg.id));
                    }}
                    className="accent-primary"
                  />
                  <span className="text-sm">{pkg.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Field builder */}
      <FieldBuilder fields={fields} onChange={setFields} />

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={isPending || urlStatus === "taken" || urlStatus === "checking"}>
          {isPending ? "Saving…" : "Save form"}
        </Button>
      </div>
      </>
      )}
    </div>
  );
}
