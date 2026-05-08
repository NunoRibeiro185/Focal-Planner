import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { GoogleCalendarPanel } from "@/components/settings/google-calendar-panel";
import { EditingWorkflowPanel } from "@/components/settings/editing-workflow-panel";
import { PlanBillingPanel } from "@/components/settings/plan-billing-panel";
import { FeatureGate } from "@/components/paywall/feature-gate";
import { getGoogleCalendarToken } from "@/lib/queries/google-calendar";
import { getEditingStageTemplates } from "@/lib/queries/command-center";
import { getSubscription } from "@/lib/queries/subscription";
import { getEffectiveTier } from "@/lib/services/entitlements";
import { DeleteAccountPanel } from "@/components/settings/delete-account-panel";
import { OnboardingPanel } from "@/components/onboarding/onboarding-panel";
import type { Photographer } from "@/lib/types";

export const revalidate = 600;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const googleStatus =
    params.google === "connected"
      ? "connected"
      : params.google === "error"
      ? "error"
      : null;

  const [
    photographerResult,
    googleToken,
    editingStages,
    subscription,
  ] = await Promise.all([
    supabase
      .from("photographers")
      .select("full_name, default_currency, slug")
      .eq("id", user.id)
      .single(),
    getGoogleCalendarToken(),
    getEditingStageTemplates(),
    getSubscription(supabase, user.id),
  ]);

  const photographer = photographerResult.data as Pick<
    Photographer,
    "full_name" | "default_currency" | "slug"
  > | null;
  const tier = getEffectiveTier(subscription);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl mb-12">Settings</h1>

      <SettingsSection
        title="Profile"
        description="Your display name and default currency."
      >
        <SettingsForm
          defaultValues={{
            full_name: photographer?.full_name ?? "",
            default_currency: photographer?.default_currency ?? "EUR",
            slug: photographer?.slug ?? "",
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Plan & Billing"
        description="Manage your subscription and payment details."
      >
        <PlanBillingPanel subscription={subscription} tier={tier} />
      </SettingsSection>

      <SettingsSection
        title="Integrations"
        description="Connect the tools you already use."
      >
        <FeatureGate
          feature="googleCalendarSync"
          description="Upgrade to Pro to connect Google Calendar and sync your bookings automatically."
        >
          <GoogleCalendarPanel
            token={googleToken}
            connectionStatus={googleStatus}
          />
        </FeatureGate>
      </SettingsSection>

      <SettingsSection
        title="Booking setup"
        description="Your post-production workflow and what you track per booking."
      >
        <EditingWorkflowPanel stages={editingStages} />
      </SettingsSection>

      <SettingsSection
        title="Onboarding & tutorials"
        description="Review the getting-started tour at any time."
      >
        <OnboardingPanel />
      </SettingsSection>

      <SettingsSection title="Account" description="Permanently delete your account and all your data.">
        <DeleteAccountPanel />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-10 border-b border-border/50 last:border-b-0">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start">
        <div>
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
