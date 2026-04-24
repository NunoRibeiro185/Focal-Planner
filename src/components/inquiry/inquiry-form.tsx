"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PackageSelector, type PackageForSelector } from "@/components/packages/package-selector";
import { submitInquiry } from "@/lib/actions/inquiries";
import { inquiryFormSchema, type InquiryFormValues } from "@/lib/types/forms";

interface Visibility {
  showPhone: boolean;
  showSecondaryName: boolean;
  showEventDate: boolean;
  showVenue: boolean;
  showLocation: boolean;
  showNotes: boolean;
  showPackages: boolean;
  showPrices: boolean;
}

interface InquiryFormProps {
  slug: string;
  packages: PackageForSelector[];
  visibility: Visibility;
  turnstileSiteKey: string;
}

export function InquiryForm({
  slug,
  packages,
  visibility,
  turnstileSiteKey,
}: InquiryFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      client_name_primary:   "",
      client_email:          "",
      client_phone:          null,
      client_name_secondary: null,
      event_date:            null,
      venue_name:            null,
      venue_address:         null,
      location:              null,
      package_template_id:   null,
      notes:                 null,
      turnstile_token:       "",
    },
  });

  const showPackageGrid = visibility.showPackages && packages.length > 0;

  function renderTurnstile() {
    if (!turnstileRef.current || !turnstileSiteKey || widgetIdRef.current) return;
    if (!(window as any).turnstile) return;

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
    if ((window as any).turnstile) {
      renderTurnstile();
      return;
    }
    const interval = setInterval(() => {
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

  async function onSubmit(values: InquiryFormValues) {
    setServerError(null);
    const result = await submitInquiry(slug, values);
    if (result.success) {
      setSubmitted(true);
    } else {
      setServerError(result.error ?? "Something went wrong. Please try again.");
      if (widgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.reset(widgetIdRef.current);
        setValue("turnstile_token", "");
      }
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center space-y-3 max-w-lg mx-auto">
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
        {/* Package selector — above the form card, full width */}
        {showPackageGrid && (
          <div className="mb-10">
            <p className="text-sm text-muted-foreground text-center mb-6">
              Choose a package, or leave blank to decide later.
            </p>
            <PackageSelector
              packages={packages}
              showPrices={visibility.showPrices}
              value={selectedPackageId}
              onChange={(id) => {
                setSelectedPackageId(id);
                setValue("package_template_id", id);
              }}
            />
          </div>
        )}

        {/* Form fields */}
        <div className={`rounded-lg border bg-card p-6 space-y-5 ${showPackageGrid ? "max-w-lg mx-auto" : ""}`}>
          {/* ── Required fields ── */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="client_name_primary">
                Your name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_name_primary"
                {...register("client_name_primary")}
                placeholder="Jane Smith"
              />
              {errors.client_name_primary && (
                <p className="text-xs text-destructive">{errors.client_name_primary.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client_email">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_email"
                type="email"
                {...register("client_email")}
                placeholder="jane@example.com"
              />
              {errors.client_email && (
                <p className="text-xs text-destructive">{errors.client_email.message}</p>
              )}
            </div>
          </div>

          {/* ── Optional fields ── */}
          {(visibility.showPhone ||
            visibility.showSecondaryName ||
            visibility.showEventDate ||
            visibility.showVenue ||
            visibility.showLocation ||
            visibility.showNotes) && (
            <div className="space-y-4 pt-1">
              {visibility.showPhone && (
                <div className="space-y-1.5">
                  <Label htmlFor="client_phone">Phone number</Label>
                  <Input
                    id="client_phone"
                    type="tel"
                    {...register("client_phone")}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              )}

              {visibility.showSecondaryName && (
                <div className="space-y-1.5">
                  <Label htmlFor="client_name_secondary">Partner&apos;s name</Label>
                  <Input
                    id="client_name_secondary"
                    {...register("client_name_secondary")}
                    placeholder="John Smith"
                  />
                </div>
              )}

              {visibility.showEventDate && (
                <div className="space-y-1.5">
                  <Label htmlFor="event_date">Event date</Label>
                  <Input
                    id="event_date"
                    type="date"
                    {...register("event_date")}
                  />
                </div>
              )}

              {visibility.showVenue && (
                <div className="space-y-1.5">
                  <Label htmlFor="venue_name">Venue name</Label>
                  <Input
                    id="venue_name"
                    {...register("venue_name")}
                    placeholder="The Grand Ballroom"
                  />
                </div>
              )}

              {visibility.showVenue && (
                <div className="space-y-1.5">
                  <Label htmlFor="venue_address">Venue address</Label>
                  <Input
                    id="venue_address"
                    {...register("venue_address")}
                    placeholder="123 Main St, City"
                  />
                </div>
              )}

              {visibility.showLocation && (
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location / City</Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="New York, NY"
                  />
                </div>
              )}

              {visibility.showNotes && (
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Anything else you&apos;d like to share?</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Tell us about your event, vision, or any questions you have..."
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Turnstile CAPTCHA ── */}
          {turnstileSiteKey ? (
            <div ref={turnstileRef} />
          ) : (
            <input type="hidden" {...register("turnstile_token")} value="dev-bypass" />
          )}
          {errors.turnstile_token && (
            <p className="text-xs text-destructive">{errors.turnstile_token.message}</p>
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
