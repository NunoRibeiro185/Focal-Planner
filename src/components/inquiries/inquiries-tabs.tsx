"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormList } from "@/components/inquiry-forms/form-list";
import { IncomingList } from "@/components/inquiry-forms/incoming-list";
import type { InquiryFormWithFields } from "@/lib/types/inquiry-forms";
import type { EffectiveTier } from "@/config/plans";

interface IncomingBooking {
  id: string;
  client_name_primary: string;
  client_email: string | null;
  created_at: string;
  inquiry_form_name_snapshot: string | null;
}

interface Props {
  forms: InquiryFormWithFields[];
  packageTemplates: { id: string; name: string }[];
  atLimit: boolean;
  tier: EffectiveTier;
  photographerSlug: string;
  incomingBookings: IncomingBooking[];
}

export function InquiriesTabs({ forms, packageTemplates, atLimit, tier, photographerSlug, incomingBookings }: Props) {
  const [activeTab, setActiveTab] = useState("incoming");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setEditingId(null); }}>
      <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="incoming">
            Incoming
            {incomingBookings.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {incomingBookings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>

        <div>
          {activeTab === "incoming" && (
            <Button asChild size="sm">
              <Link href="/inquiries/new">+ New Inquiry</Link>
            </Button>
          )}
          {activeTab === "forms" && !editingId && (
            <Button
              size="sm"
              disabled={atLimit}
              title={atLimit ? "Upgrade to create more forms" : undefined}
              variant={atLimit ? "outline" : "default"}
              onClick={() => setEditingId("new")}
            >
              New Form
            </Button>
          )}
        </div>
      </div>

      <TabsContent value="incoming" className="mt-6">
        <IncomingList bookings={incomingBookings} />
      </TabsContent>

      <TabsContent value="forms" className="mt-6">
        <FormList
          forms={forms}
          packageTemplates={packageTemplates}
          atLimit={atLimit}
          tier={tier}
          photographerSlug={photographerSlug}
          externalEditingId={editingId}
          onExternalEditingIdChange={setEditingId}
        />
      </TabsContent>
    </Tabs>
  );
}
