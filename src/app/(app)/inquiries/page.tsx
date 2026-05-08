import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInquiryForms } from "@/lib/queries/inquiry-forms";
import { getPackageTemplates } from "@/lib/queries/packages";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveTier, hasReachedLimit } from "@/lib/services/entitlements";
import { FormList } from "@/components/inquiry-forms/form-list";
import { IncomingList } from "@/components/inquiry-forms/incoming-list";

export default async function InquiriesPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) redirect("/login");

  const [forms, packageTemplates, subResult, incomingResult] = await Promise.all([
    getInquiryForms(),
    getPackageTemplates(),
    supabase.from("subscriptions").select("*").eq("photographer_id", user!.id).maybeSingle(),
    supabase
      .from("bookings")
      .select("id, client_name_primary, client_email, created_at, inquiry_form_name_snapshot")
      .eq("photographer_id", user!.id)
      .eq("status", "inquiry")
      .order("created_at", { ascending: false }),
  ]);

  const tier = getEffectiveTier(subResult.data);
  const atLimit = hasReachedLimit(tier, "inquiryFormsTotal", forms.length);
  const incomingBookings = incomingResult.data ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-wide">Inquiries</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your inquiry forms and review incoming leads.</p>
      </div>

      <Tabs defaultValue="forms">
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="incoming">
            Incoming
            {incomingBookings.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {incomingBookings.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="mt-6">
          <FormList
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            forms={forms as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            packageTemplates={packageTemplates as any}
            atLimit={atLimit}
            tier={tier}
          />
        </TabsContent>

        <TabsContent value="incoming" className="mt-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <IncomingList bookings={incomingBookings as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
