"use client";

import { useState, useEffect, useRef, useTransition, useId } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { saveInquiryForm, checkFormUrlAvailable } from "@/lib/actions/inquiry-forms";
import { normalizeFormUrl } from "@/lib/utils/inquiry-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldCard } from "./field-card";
import { FieldPalette } from "./field-palette";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import type {
  InquiryFormWithFields, InquiryFormField, InquiryFieldType, InquiryFieldMapping,
} from "@/lib/types/inquiry-forms";

interface Props {
  form: InquiryFormWithFields | null;
  packageTemplates: { id: string; name: string }[];
  photographerSlug: string;
  onClose: () => void;
}

type UrlStatus = "idle" | "checking" | "available" | "taken";

const MAPPING_LABELS: Record<InquiryFieldMapping, string> = {
  client_name_secondary: "Partner's name",
  client_phone: "Phone number",
  event_date: "Event date",
  venue_name: "Venue name",
  venue_address: "Venue address",
  location: "Location / city",
  notes: "Anything else?",
  package_template_id: "Package",
};

const TYPE_LABELS: Record<InquiryFieldType, string> = {
  short_text: "Short answer",
  long_text: "Long answer",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  number: "Number",
  date: "Date",
};

export function FormEditor({ form, packageTemplates, photographerSlug, onClose }: Props) {
  const [name, setName] = useState(form?.name ?? "");
  const [formUrl, setFormUrl] = useState(form?.form_url ?? "");
  const [isActive, setIsActive] = useState(form?.is_active ?? true);
  const [allowedPackageIds, setAllowedPackageIds] = useState<string[]>(form?.allowed_package_ids ?? []);
  const [fields, setFields] = useState<InquiryFormField[]>(form?.fields ?? []);
  const [isPending, startTransition] = useTransition();
  const [urlStatus, setUrlStatus] = useState<UrlStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [formUrl, form?.form_url, form?.id]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    setFields(arrayMove(fields, oldIndex, newIndex));
  }

  function handleAdd(fieldType: InquiryFieldType, fieldMapping?: InquiryFieldMapping) {
    const newField: InquiryFormField = {
      id: crypto.randomUUID(),
      form_id: "",
      photographer_id: "",
      field_type: fieldType,
      label: fieldMapping ? MAPPING_LABELS[fieldMapping] : TYPE_LABELS[fieldType],
      helper_text: null,
      is_required: false,
      sort_order: fields.length,
      field_mapping: fieldMapping ?? null,
      options: [],
    };
    setFields((prev) => [...prev, newField]);
  }

  function handleUpdate(id: string, update: Partial<InquiryFormField>) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...update } : f));
  }

  function handleRemove(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  const existingMappings = new Set(
    fields.map((f) => f.field_mapping).filter(Boolean) as InquiryFieldMapping[]
  );

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

  return (
    <div className="flex gap-4 items-start">
      {/* Left: field palette */}
      <aside className="w-44 shrink-0 sticky top-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add field</p>
        <FieldPalette existingMappings={existingMappings} onAdd={handleAdd} />
      </aside>

      {/* Center: form canvas */}
      <div className="flex-1 min-w-0 space-y-3">
        <SystemFieldCard label="Your name" />
        <SystemFieldCard label="Email address" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} id={dndId} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                packageTemplates={packageTemplates}
                allowedPackageIds={allowedPackageIds}
                onUpdate={(u) => handleUpdate(field.id, u)}
                onRemove={() => handleRemove(field.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {fields.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Add fields from the panel on the left.
          </div>
        )}

        <Button disabled className="w-full opacity-50 pointer-events-none">Send inquiry</Button>
      </div>

      {/* Right: settings panel */}
      <aside className="w-60 shrink-0 sticky top-4">
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to forms
          </button>

          <div className="space-y-1.5">
            <Label htmlFor="form-name" className="text-xs">Form name</Label>
            <Input
              id="form-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Portugal wedding inquiry"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-url" className="text-xs">URL</Label>
            <div className="flex">
              <span className="flex items-center px-2 text-xs text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md whitespace-nowrap shrink-0">
                /{photographerSlug || "…"}/
              </span>
              <div className="relative flex-1 min-w-0">
                <Input
                  id="form-url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  onBlur={(e) => setFormUrl(normalizeFormUrl(e.target.value))}
                  placeholder="sub-slug"
                  className="rounded-l-none pr-7 text-sm"
                  autoComplete="off"
                />
                {urlStatus !== "idle" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {urlStatus === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {urlStatus === "available" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    {urlStatus === "taken" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  </span>
                )}
              </div>
            </div>
            {urlStatus === "taken" && <p className="text-xs text-destructive">Already in use.</p>}
            {urlStatus === "available" && <p className="text-xs text-green-600">Available!</p>}
            {urlStatus === "idle" && (
              <p className="text-xs text-muted-foreground font-mono truncate" title={previewUrl}>{previewUrl}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is-active" className="text-sm cursor-pointer">Active</Label>
          </div>

          {packageTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Packages (optional)</Label>
              <p className="text-xs text-muted-foreground -mt-1">If none selected, all packages are shown.</p>
              <div className="space-y-1">
                {packageTemplates.map((pkg) => (
                  <label key={pkg.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={allowedPackageIds.includes(pkg.id)}
                      onChange={(e) => {
                        if (e.target.checked) setAllowedPackageIds((p) => [...p, pkg.id]);
                        else setAllowedPackageIds((p) => p.filter((id) => id !== pkg.id));
                      }}
                      className="accent-primary"
                    />
                    <span className="truncate">{pkg.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isPending || urlStatus === "taken" || urlStatus === "checking"}
            className="w-full"
          >
            {isPending ? "Saving…" : "Save form"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function SystemFieldCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-card/50 p-4 space-y-1.5 select-none">
      <Label className="text-sm font-medium text-foreground/50 flex items-center gap-1">
        {label}
        <span className="text-destructive/50">*</span>
        <span className="text-xs font-normal text-muted-foreground/40 ml-1">(always collected)</span>
      </Label>
      <Input disabled className="opacity-30" />
    </div>
  );
}
