import { notFound } from "next/navigation";
import { getBookingById } from "@/lib/queries/bookings";
import { getPackageTemplatesWithServices } from "@/lib/queries/packages";
import { getServices } from "@/lib/queries/services";
import { getExtras } from "@/lib/queries/extras";
import { BookingForm } from "@/components/bookings/booking-form";
import { ExtrasPanel } from "@/components/bookings/extras-panel";
import { updateBookingFull } from "@/lib/actions/bookings";
import type { BookingFormValues, ItineraryStopInput } from "@/lib/types/forms";
import type { BuilderLineItem } from "@/lib/utils/booking-builder";
import { Separator } from "@/components/ui/separator";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [data, packages, catalogServices, catalogExtras] = await Promise.all([
    getBookingById(id).catch(() => notFound()),
    getPackageTemplatesWithServices(),
    getServices(),
    getExtras(),
  ]);

  const { booking, bookingExtras, itineraryStops } = data;

  async function handleUpdate(
    values: BookingFormValues,
    _services: BuilderLineItem[],
    itinerary: ItineraryStopInput[]
  ) {
    "use server";
    await updateBookingFull(id, values, null, itinerary);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Edit Booking</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {booking.client_name_primary}
          {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
        </p>
        <BookingForm
          services={catalogServices}
          packages={packages}
          onSubmit={handleUpdate}
        />
      </div>

      <Separator />

      <div className="max-w-2xl">
        <h2 className="text-sm font-medium mb-4">Extras</h2>
        <ExtrasPanel
          bookingId={id}
          extras={bookingExtras}
          catalogExtras={catalogExtras}
          currency={booking.package_version?.currency ?? "EUR"}
        />
      </div>
    </div>
  );
}
