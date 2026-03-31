import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { CustomFieldsPanel } from "@/components/settings/custom-fields-panel";
import { GoogleCalendarPanel } from "@/components/settings/google-calendar-panel";
import { EditingWorkflowPanel } from "@/components/settings/editing-workflow-panel";
import { InquiryFormPanel } from "@/components/settings/inquiry-form-panel";
import { getCustomFieldDefinitions } from "@/lib/queries/custom-fields";
import { getGoogleCalendarToken } from "@/lib/queries/google-calendar";
import { getEditingStageTemplates } from "@/lib/queries/command-center";
import { getInquirySettings } from "@/lib/queries/inquiries";
import type { Photographer } from "@/lib/types";

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
  const googleStatus = params.google === "connected"
    ? "connected"
    : params.google === "error"
    ? "error"
    : null;

  const [photographerResult, customFields, googleToken, editingStages, inquirySettings] =
    await Promise.all([
      supabase
        .from("photographers")
        .select("full_name, default_currency")
        .eq("id", user.id)
        .single(),
      getCustomFieldDefinitions(),
      getGoogleCalendarToken(),
      getEditingStageTemplates(),
      getInquirySettings(),
    ]);

  const photographer = photographerResult.data as Pick<Photographer, "full_name" | "default_currency"> | null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <SettingsForm
            defaultValues={{
              full_name: photographer?.full_name ?? "",
              default_currency: photographer?.default_currency ?? "EUR",
            }}
          />
          <GoogleCalendarPanel token={googleToken} connectionStatus={googleStatus} />
          <EditingWorkflowPanel stages={editingStages} />
        </div>
        <div className="flex flex-col gap-6">
          <CustomFieldsPanel fields={customFields} />
          <InquiryFormPanel
            defaultValues={{
              slug:                        inquirySettings?.slug ?? "",
              inquiry_form_enabled:        inquirySettings?.inquiry_form_enabled ?? false,
              inquiry_show_packages:       inquirySettings?.inquiry_show_packages ?? true,
              inquiry_show_prices:         inquirySettings?.inquiry_show_prices ?? true,
              inquiry_show_phone:          inquirySettings?.inquiry_show_phone ?? true,
              inquiry_show_secondary_name: inquirySettings?.inquiry_show_secondary_name ?? true,
              inquiry_show_event_date:     inquirySettings?.inquiry_show_event_date ?? true,
              inquiry_show_venue:          inquirySettings?.inquiry_show_venue ?? true,
              inquiry_show_location:       inquirySettings?.inquiry_show_location ?? true,
              inquiry_show_notes:          inquirySettings?.inquiry_show_notes ?? true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
