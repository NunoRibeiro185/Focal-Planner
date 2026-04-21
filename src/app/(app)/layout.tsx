import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AppFooter } from "@/components/layout/app-footer";
import { Toaster } from "sonner";
import { SubscriptionProvider } from "@/lib/contexts/subscription-context";
import { TrialWarningBanner } from "@/components/paywall/trial-warning-banner";
import { getSubscription } from "@/lib/queries/subscription";
import { getEffectiveTier, isInTrialWarningWindow } from "@/lib/services/entitlements";
import { maybeDispatchTrialWarning } from "@/lib/services/trial-warning";
import { LAUNCH_WINDOW } from "@/config/plans";
import { format } from "date-fns";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [subscription, photographerResult] = await Promise.all([
    getSubscription(supabase, user.id),
    supabase
      .from("photographers")
      .select("id, email, full_name, trial_warning_sent_at")
      .eq("id", user.id)
      .single(),
  ]);

  const photographer = photographerResult.data;
  const tier = getEffectiveTier(subscription);

  const now = new Date();
  const showTrialBanner = tier === "trial" && isInTrialWarningWindow(now);

  if (photographer) {
    void maybeDispatchTrialWarning(
      {
        id: photographer.id,
        email: photographer.email,
        full_name: photographer.full_name,
        trial_warning_sent_at: photographer.trial_warning_sent_at,
      },
      now
    );
  }

  const expiryDateLabel = format(LAUNCH_WINDOW.end, "d MMMM yyyy");

  return (
    <SubscriptionProvider tier={tier}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {showTrialBanner && <TrialWarningBanner expiryDateLabel={expiryDateLabel} />}
          <main className="flex-1 overflow-y-auto overscroll-y-contain">
            <div className="min-h-full flex flex-col">
              <div className="flex-1 pb-16 md:pb-0">
                {children}
              </div>
              <AppFooter />
            </div>
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </SubscriptionProvider>
  );
}
