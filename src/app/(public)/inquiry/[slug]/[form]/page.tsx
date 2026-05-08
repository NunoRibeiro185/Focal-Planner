import { notFound } from "next/navigation";
import { getPublicFormDefinition } from "@/lib/queries/inquiry-forms";
import { DynamicInquiryForm } from "@/components/inquiry/inquiry-form";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string; form: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, form } = await params;
  const data = await getPublicFormDefinition(slug, form);
  const name = data?.photographerName ?? "Photographer";
  return { title: `Inquiry — ${name}` };
}

export default async function PublicInquiryFormPage({ params }: Props) {
  const { slug, form } = await params;
  const data = await getPublicFormDefinition(slug, form);

  if (!data) notFound();

  const hasPackageField = data.fields.some((f) => f.field_mapping === "package_template_id");

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-12 px-4">
      <div className={`w-full ${hasPackageField && data.packages.length > 0 ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{data.photographerName}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fill in the form below and we&apos;ll be in touch.
          </p>
        </div>

        <DynamicInquiryForm
          photographerUrl={slug}
          formUrl={form}
          formDefinition={data}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        />

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          Powered by Focal Planner
        </p>
      </div>
    </div>
  );
}
