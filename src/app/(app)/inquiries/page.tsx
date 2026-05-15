import { redirect } from "next/navigation";
import { getInquiryForms } from "@/lib/queries/inquiry-forms";
import { getPackageTemplates } from "@/lib/queries/packages";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveTier, hasReachedLimit } from "@/lib/services/entitlements";
import { InquiriesTabs } from "@/components/inquiries/inquiries-tabs";

export default async function InquiriesPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) redirect("/login");

  const [forms, packageTemplates, subResult, incomingResult, slugResult] = await Promise.all([
    getInquiryForms(),
    getPackageTemplates(),
    supabase.from("subscriptions").select("*").eq("photographer_id", user!.id).maybeSingle(),
    supabase
      .from("bookings")
      .select("id, client_name_primary, client_email, created_at, inquiry_form_name_snapshot")
      .eq("photographer_id", user!.id)
      .eq("status", "inquiry")
      .order("created_at", { ascending: false }),
    supabase.from("photographers").select("slug").eq("id", user!.id).single(),
  ]);

  const tier = getEffectiveTier(subResult.data);
  const atLimit = hasReachedLimit(tier, "inquiryFormsTotal", forms.length);
  const incomingBookings = incomingResult.data ?? [];
  const photographerSlug = slugResult.data?.slug ?? "";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-wide">Inquiries</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your inquiry forms and review incoming leads.</p>
      </div>

      <InquiriesTabs
        forms={forms}
        packageTemplates={packageTemplates}
        atLimit={atLimit}
        tier={tier}
        photographerSlug={photographerSlug}
        incomingBookings={incomingBookings}
      />
    </div>
  );
}
