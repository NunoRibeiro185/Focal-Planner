import { notFound } from "next/navigation";
import { getBookingById } from "@/lib/queries/bookings";
import { getAllPackageTemplates } from "@/lib/queries/packages";
import { getExtras } from "@/lib/queries/extras";
import { BookingForm } from "@/components/bookings/booking-form";
import { ExtrasPanel } from "@/components/bookings/extras-panel";
import { updateBookingFull } from "@/lib/actions/bookings";
import type { BookingFormValues, BookingExtraValues, ItineraryStopInput } from "@/lib/types/forms";
import { Separator } from "@/components/ui/separator";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [data, packages, catalogExtras] = await Promise.all([
    getBookingById(id).catch(() => notFound()),
    getAllPackageTemplates(),
    getExtras(),
  ]);

  const { booking, bookingExtras, itineraryStops } = data;
  const v = booking.package_version;

  const originalPackageTemplateId = v.package_template_id;

  const defaultValues: Partial<BookingFormValues> = {
    package_template_id: originalPackageTemplateId,
    client_name_primary: booking.client_name_primary,
    client_name_secondary: booking.client_name_secondary,
    client_email: booking.client_email,
    client_phone: booking.client_phone,
    lead_source: booking.lead_source ?? null,
    event_date: booking.event_date,
    notes: booking.notes,
    price_override: booking.price_override,
    hours_override: booking.hours_override,
    deposit_amount: booking.deposit_amount,
    payment_due_date: booking.payment_due_date,
  };

  const initialItinerary: ItineraryStopInput[] = itineraryStops.map((s) => ({
    name: s.name,
    address: s.address ?? "",
    start_time: s.start_time ?? "",
    notes: s.notes ?? "",
  }));

  async function handleUpdate(
    values: BookingFormValues,
    _extras: BookingExtraValues[],
    itinerary: ItineraryStopInput[]
  ) {
    "use server";
    await updateBookingFull(id, values, originalPackageTemplateId, itinerary);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Edit Booking</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {booking.client_name_primary}
          {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
        </p>
        <BookingForm
          packages={packages}
          defaultValues={defaultValues}
          initialItinerary={initialItinerary}
          onSubmit={handleUpdate}
          submitLabel="Save Changes"
        />
      </div>

      <Separator />

      <div className="max-w-2xl">
        <h2 className="text-sm font-medium mb-4">Extras</h2>
        <ExtrasPanel
          bookingId={id}
          extras={bookingExtras}
          catalogExtras={catalogExtras}
          currency={v.currency}
        />
      </div>
    </div>
  );
}
