"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveInquiryForm } from "@/lib/actions/inquiry-forms";
import { normalizeFormUrl } from "@/lib/utils/inquiry-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldBuilder } from "./field-builder";
import type { InquiryFormWithFields, InquiryFormField } from "@/lib/types/inquiry-forms";

interface Props {
  form: InquiryFormWithFields | null; // null = new form
  packageTemplates: { id: string; name: string }[];
  onClose: () => void;
}

export function FormEditor({ form, packageTemplates, onClose }: Props) {
  const [name, setName] = useState(form?.name ?? "");
  const [formUrl, setFormUrl] = useState(form?.form_url ?? "");
  const [isActive, setIsActive] = useState(form?.is_active ?? true);
  const [allowedPackageIds, setAllowedPackageIds] = useState<string[]>(form?.allowed_package_ids ?? []);
  const [fields, setFields] = useState<InquiryFormField[]>(form?.fields ?? []);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) { toast.error("Form name is required."); return; }
    if (!formUrl.trim()) { toast.error("Form URL is required."); return; }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-[family-name:var(--font-heading)]">
          {form ? `Edit: ${form.name}` : "New form"}
        </h2>
        <Button variant="ghost" onClick={onClose}>Back to forms</Button>
      </div>

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">/inquiry/.../</span>
            <Input
              id="form-url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              onBlur={(e) => setFormUrl(normalizeFormUrl(e.target.value))}
              placeholder="portugal-wedding"
            />
          </div>
          <p className="text-xs text-muted-foreground">Auto-formatted to lowercase with hyphens.</p>
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
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save form"}
        </Button>
      </div>
    </div>
  );
}
