import { notFound } from "next/navigation";
import { getPublicInquiryFormData } from "@/lib/queries/inquiries";
import { InquiryForm } from "@/components/inquiry/inquiry-form";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicInquiryFormData(slug);
  const name = data?.photographer.full_name ?? "Photographer";
  return { title: `Inquiry — ${name}` };
}

export default async function PublicInquiryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicInquiryFormData(slug);

  if (!data) notFound();

  const { photographer, packages } = data;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">
            {photographer.full_name ?? "Inquiry"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fill in the form below and we&apos;ll be in touch.
          </p>
        </div>

        <InquiryForm
          slug={slug}
          packages={packages}
          visibility={{
            showPhone:          photographer.inquiry_show_phone,
            showSecondaryName:  photographer.inquiry_show_secondary_name,
            showEventDate:      photographer.inquiry_show_event_date,
            showVenue:          photographer.inquiry_show_venue,
            showLocation:       photographer.inquiry_show_location,
            showNotes:          photographer.inquiry_show_notes,
            showPackages:       photographer.inquiry_show_packages,
            showPrices:         photographer.inquiry_show_prices,
          }}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        />

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          Powered by Focal
        </p>
      </div>
    </div>
  );
}
