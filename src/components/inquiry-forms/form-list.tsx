"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleInquiryFormActive, archiveInquiryForm } from "@/lib/actions/inquiry-forms";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Archive, Link2, Check } from "lucide-react";
import { FormEditor } from "./form-editor";
import type { InquiryFormWithFields } from "@/lib/types/inquiry-forms";
import type { EffectiveTier } from "@/config/plans";

interface Props {
  forms: InquiryFormWithFields[];
  packageTemplates: { id: string; name: string }[];
  atLimit: boolean;
  tier: EffectiveTier;
  photographerSlug: string;
  externalEditingId?: string | "new" | null;
  onExternalEditingIdChange?: (id: string | "new" | null) => void;
}

export function FormList({ forms, packageTemplates, atLimit, tier: _tier, photographerSlug, externalEditingId, onExternalEditingIdChange }: Props) {
  const [internalEditingId, setInternalEditingId] = useState<string | "new" | null>(null);

  const controlled = externalEditingId !== undefined;
  const editingId = controlled ? externalEditingId : internalEditingId;
  const setEditingId = controlled ? (onExternalEditingIdChange ?? (() => {})) : setInternalEditingId;

  if (editingId !== null) {
    const form = editingId === "new" ? null : forms.find((f) => f.id === editingId) ?? null;
    return (
      <FormEditor
        form={form}
        packageTemplates={packageTemplates}
        photographerSlug={photographerSlug}
        onClose={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!controlled && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => !atLimit && setEditingId("new")}
              disabled={atLimit}
              title={atLimit ? "Upgrade to create more forms" : undefined}
              variant={atLimit ? "outline" : "default"}
            >
              New form
            </Button>
          </div>
          {atLimit && (
            <p className="text-xs text-muted-foreground text-right -mt-3">
              Upgrade to Pro to create unlimited forms.
            </p>
          )}
        </>
      )}
      {atLimit && controlled && (
        <p className="text-xs text-muted-foreground -mt-1">
          Upgrade to Pro to create unlimited forms.
        </p>
      )}

      {forms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No forms yet. Create your first inquiry form to start collecting leads.
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              photographerSlug={photographerSlug}
              onEdit={() => setEditingId(form.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FormCard({ form, photographerSlug, onEdit }: {
  form: InquiryFormWithFields;
  photographerSlug: string;
  onEdit: () => void;
}) {
  const [active, setActive] = useState(form.is_active);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    const next = !active;
    setActive(next);
    const result = await toggleInquiryFormActive(form.id, next);
    if (!result.success) {
      setActive(!next);
      toast.error(result.error ?? "Failed to update form");
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive "${form.name}"? Existing submissions will not be affected.`)) return;
    const result = await archiveInquiryForm(form.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to archive form");
    } else {
      router.refresh();
    }
  }

  const fullUrl = photographerSlug ? `${photographerSlug}/${form.form_url}` : form.form_url;

  async function handleCopy() {
    const url = `${window.location.origin}/inquiry/${fullUrl}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{form.name}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">/inquiry/{fullUrl}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Switch checked={active} onCheckedChange={handleToggle} aria-label="Active" />
        <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy link">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleArchive}>
          <Archive className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
