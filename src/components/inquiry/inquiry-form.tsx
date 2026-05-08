"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { submitInquiry } from "@/lib/actions/inquiries";
import { extractMappedValues, buildAnswerPayloads } from "@/lib/utils/inquiry-forms";
import type { PublicFormDefinition, InquiryFormField } from "@/lib/types/inquiry-forms";

interface Props {
  photographerUrl: string;
  formUrl: string;
  formDefinition: PublicFormDefinition;
  turnstileSiteKey: string;
}

function buildSchema(fields: InquiryFormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {
    client_name_primary: z.string().min(1, "Name is required"),
    client_email: z.string().email("Invalid email address"),
    turnstile_token: z.string().min(1, "Please complete the CAPTCHA"),
  };

  for (const field of fields) {
    const base =
      field.field_type === "multiple_choice"
        ? z.array(z.string())
        : z.string();

    shape[field.id] = field.is_required
      ? field.field_type === "multiple_choice"
        ? (base as z.ZodArray<z.ZodString>).min(1, `${field.label} is required`)
        : (base as z.ZodString).min(1, `${field.label} is required`)
      : base.optional();
  }

  return z.object(shape);
}

function buildDefaultValues(fields: InquiryFormField[]): Record<string, string | string[]> {
  const defaults: Record<string, string | string[]> = {
    client_name_primary: "",
    client_email: "",
    turnstile_token: "",
  };
  for (const field of fields) {
    defaults[field.id] = field.field_type === "multiple_choice" ? [] : "";
  }
  return defaults;
}

export function DynamicInquiryForm({ photographerUrl, formUrl, formDefinition, turnstileSiteKey }: Props) {
  const { fields, packages } = formDefinition;
  const schema = buildSchema(fields);
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(fields) as Record<string, unknown>,
  });

  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  function renderTurnstile() {
    if (!turnstileRef.current || !turnstileSiteKey || widgetIdRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).turnstile) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    widgetIdRef.current = (window as any).turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => {
        setValue("turnstile_token", token, { shouldValidate: true });
      },
      "expired-callback": () => {
        setValue("turnstile_token", "", { shouldValidate: false });
      },
    });
  }

  useEffect(() => {
    if (!turnstileSiteKey) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).turnstile) {
      renderTurnstile();
      return;
    }
    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).turnstile) {
        renderTurnstile();
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnstileSiteKey]);

  function onTurnstileLoad() {
    renderTurnstile();
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const answersRecord: Record<string, string> = {};
    for (const field of fields) {
      const raw = values[field.id as keyof FormValues];
      if (Array.isArray(raw)) {
        answersRecord[field.id] = raw.join(", ");
      } else if (raw !== undefined && raw !== null && raw !== "") {
        answersRecord[field.id] = String(raw);
      }
    }

    const mapped = extractMappedValues(fields, answersRecord);
    const answers = buildAnswerPayloads(fields, answersRecord);

    const result = await submitInquiry(photographerUrl, formUrl, {
      client_name_primary: values.client_name_primary as string,
      client_email: values.client_email as string,
      client_name_secondary: (mapped.client_name_secondary as string | undefined) ?? null,
      client_phone: (mapped.client_phone as string | undefined) ?? null,
      event_date: (mapped.event_date as string | undefined) ?? null,
      venue_name: (mapped.venue_name as string | undefined) ?? null,
      venue_address: (mapped.venue_address as string | undefined) ?? null,
      location: (mapped.location as string | undefined) ?? null,
      package_template_id: (mapped.package_template_id as string | undefined) ?? null,
      notes: (mapped.notes as string | undefined) ?? null,
      turnstile_token: values.turnstile_token as string,
      answers,
    });

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong. Please try again.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (widgetIdRef.current && (window as any).turnstile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).turnstile.reset(widgetIdRef.current);
        setValue("turnstile_token", "");
      }
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto" strokeWidth={1.5} />
        <h2 className="text-xl font-semibold">Inquiry sent</h2>
        <p className="text-sm text-muted-foreground">
          Thank you — we&apos;ll be in touch with you shortly.
        </p>
      </div>
    );
  }

  return (
    <>
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={onTurnstileLoad}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="rounded-lg border bg-card p-6 space-y-5">
          {/* Always-present system fields */}
          <div className="space-y-1.5">
            <Label htmlFor="client_name_primary">
              Your name <span className="text-destructive">*</span>
            </Label>
            <Input id="client_name_primary" {...register("client_name_primary")} placeholder="Jane Smith" />
            {errors.client_name_primary && (
              <p className="text-xs text-destructive">{errors.client_name_primary.message as string}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client_email">
              Email address <span className="text-destructive">*</span>
            </Label>
            <Input id="client_email" type="email" {...register("client_email")} placeholder="jane@example.com" />
            {errors.client_email && (
              <p className="text-xs text-destructive">{errors.client_email.message as string}</p>
            )}
          </div>

          {/* Dynamic fields */}
          {fields.map((field) => (
            <DynamicField
              key={field.id}
              field={field}
              packages={packages}
              register={register}
              setValue={setValue}
              watch={watch}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              error={errors[field.id as keyof FormValues]?.message as string | undefined}
            />
          ))}

          {/* Turnstile */}
          {turnstileSiteKey ? (
            <div ref={turnstileRef} />
          ) : (
            <input type="hidden" {...register("turnstile_token")} value="dev-bypass" />
          )}
          {errors.turnstile_token && (
            <p className="text-xs text-destructive">{errors.turnstile_token.message as string}</p>
          )}

          {serverError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send inquiry"}
          </Button>
        </div>
      </form>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DynamicField({ field, packages, register, setValue, watch, error }: {
  field: InquiryFormField;
  packages: PublicFormDefinition["packages"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: any;
  error?: string;
}) {
  const label = `${field.label}${field.is_required ? " *" : ""}`;

  // Package selector — hidden when no packages exist to prevent a required field
  // from falling through to a plain text input (which can't hold a valid UUID).
  if (field.field_mapping === "package_template_id") {
    if (packages.length === 0) return null;
    const selected = watch(field.id);
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {field.helper_text && <p className="text-xs text-muted-foreground">{field.helper_text}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setValue(field.id, selected === pkg.id ? "" : pkg.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                selected === pkg.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium text-sm">{pkg.name}</p>
              {pkg.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
              )}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Long text
  if (field.field_type === "long_text") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.id}>{label}</Label>
        {field.helper_text && <p className="text-xs text-muted-foreground">{field.helper_text}</p>}
        <Textarea id={field.id} {...register(field.id)} rows={4} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Single choice (radio)
  if (field.field_type === "single_choice") {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {field.helper_text && <p className="text-xs text-muted-foreground">{field.helper_text}</p>}
        <div className="space-y-2">
          {field.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={opt.label} {...register(field.id)} className="accent-primary" />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Multiple choice (checkboxes)
  if (field.field_type === "multiple_choice") {
    const selected: string[] = watch(field.id) ?? [];
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {field.helper_text && <p className="text-xs text-muted-foreground">{field.helper_text}</p>}
        <div className="space-y-2">
          {field.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selected.includes(opt.label)}
                onCheckedChange={(checked) => {
                  if (checked) setValue(field.id, [...selected, opt.label]);
                  else setValue(field.id, selected.filter((v: string) => v !== opt.label));
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Short text, number, date
  const inputType = field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id}>{label}</Label>
      {field.helper_text && <p className="text-xs text-muted-foreground">{field.helper_text}</p>}
      <Input id={field.id} type={inputType} {...register(field.id)} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
