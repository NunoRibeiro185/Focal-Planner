import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { CustomFieldsPanel } from "@/components/settings/custom-fields-panel";
import { GoogleCalendarPanel } from "@/components/settings/google-calendar-panel";
import { EditingWorkflowPanel } from "@/components/settings/editing-workflow-panel";
import { getCustomFieldDefinitions } from "@/lib/queries/custom-fields";
import { getGoogleCalendarToken } from "@/lib/queries/google-calendar";
import { getEditingStageTemplates } from "@/lib/queries/command-center";
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

  const [photographerResult, customFields, googleToken, editingStages] =
    await Promise.all([
      supabase
        .from("photographers")
        .select("full_name, default_currency")
        .eq("id", user.id)
        .single(),
      getCustomFieldDefinitions(),
      getGoogleCalendarToken(),
      getEditingStageTemplates(),
    ]);

  const photographer = photographerResult.data as Pick<Photographer, "full_name" | "default_currency"> | null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
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
        <CustomFieldsPanel fields={customFields} />
      </div>
    </div>
  );
}
