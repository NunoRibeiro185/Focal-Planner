import { notFound } from "next/navigation";
import { getBookingById } from "@/lib/queries/bookings";
import { getPackageTemplatesWithServices } from "@/lib/queries/packages";
import { getServices } from "@/lib/queries/services";
import { BookingForm } from "@/components/bookings/booking-form";
import { updateBookingFull } from "@/lib/actions/bookings";
import type { BookingFormValues, ItineraryStopInput } from "@/lib/types/forms";
import type { BuilderLineItem } from "@/lib/utils/booking-builder";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [data, packages, catalogServices] = await Promise.all([
    getBookingById(id).catch(() => notFound()),
    getPackageTemplatesWithServices(),
    getServices(),
  ]);

  const { booking } = data;

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
    </div>
  );
}
