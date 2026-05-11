"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { InquiryFormField } from "@/lib/types/inquiry-forms";

interface PackageOption {
  id: string;
  name: string;
}

interface Props {
  fields: InquiryFormField[];
  packageTemplates: PackageOption[];
}

export function FormPreview({ fields, packageTemplates }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-lg border bg-card p-6 space-y-5 pointer-events-none select-none">
        {/* Fixed system fields */}
        <PreviewField label="Your name" required>
          <Input disabled placeholder="Jane Smith" className="opacity-60" />
        </PreviewField>

        <PreviewField label="Email address" required>
          <Input disabled placeholder="jane@example.com" className="opacity-60" />
        </PreviewField>

        {/* Dynamic fields */}
        {fields.map((field) => (
          <PreviewDynamicField
            key={field.id}
            field={field}
            packageTemplates={packageTemplates}
          />
        ))}

        <Button disabled className="w-full opacity-60">Send inquiry</Button>
      </div>
    </div>
  );
}

function PreviewField({
  label,
  required,
  helperText,
  children,
}: {
  label: string;
  required?: boolean;
  helperText?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {children}
    </div>
  );
}

function PreviewDynamicField({
  field,
  packageTemplates,
}: {
  field: InquiryFormField;
  packageTemplates: PackageOption[];
}) {
  const label = field.label;
  const required = field.is_required;

  // Package selector
  if (field.field_mapping === "package_template_id") {
    if (packageTemplates.length === 0) return null;
    return (
      <div className="space-y-2">
        <Label className="text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.helper_text && (
          <p className="text-xs text-muted-foreground">{field.helper_text}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {packageTemplates.map((pkg) => (
            <div
              key={pkg.id}
              className="text-left rounded-lg border border-border p-4 opacity-70"
            >
              <p className="font-medium text-sm">{pkg.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.field_type === "long_text") {
    return (
      <PreviewField label={label} required={required} helperText={field.helper_text}>
        <Textarea disabled rows={4} className="opacity-60" />
      </PreviewField>
    );
  }

  if (field.field_type === "single_choice") {
    return (
      <div className="space-y-2">
        <Label className="text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.helper_text && (
          <p className="text-xs text-muted-foreground">{field.helper_text}</p>
        )}
        <div className="space-y-2">
          {field.options.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No options added yet</p>
          ) : (
            field.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 opacity-70">
                <input type="radio" disabled className="accent-primary" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      </div>
    );
  }

  if (field.field_type === "multiple_choice") {
    return (
      <div className="space-y-2">
        <Label className="text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.helper_text && (
          <p className="text-xs text-muted-foreground">{field.helper_text}</p>
        )}
        <div className="space-y-2">
          {field.options.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No options added yet</p>
          ) : (
            field.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 opacity-70">
                <Checkbox disabled />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      </div>
    );
  }

  const inputType =
    field.field_type === "date"
      ? "date"
      : field.field_type === "number"
      ? "number"
      : "text";

  return (
    <PreviewField label={label} required={required} helperText={field.helper_text}>
      <Input disabled type={inputType} className="opacity-60" />
    </PreviewField>
  );
}
