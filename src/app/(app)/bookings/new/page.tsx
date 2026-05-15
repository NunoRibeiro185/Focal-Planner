import { getServices } from "@/lib/queries/services";
import { getPackageTemplatesWithServices } from "@/lib/queries/packages";
import { BookingForm } from "@/components/bookings/booking-form";
import { createBooking } from "@/lib/actions/bookings";
import type { BookingFormValues, BookingServiceValues, ItineraryStopInput } from "@/lib/types/forms";
import type { BuilderLineItem } from "@/lib/utils/booking-builder";

export default async function NewBookingPage() {
  const [services, packages] = await Promise.all([
    getServices(),
    getPackageTemplatesWithServices(),
  ]);

  async function handleCreate(
    values: BookingFormValues,
    serviceItems: BuilderLineItem[],
    itinerary: ItineraryStopInput[],
    depositAlreadyPaid: boolean,
    addAnother: boolean
  ) {
    "use server";
    const serviceValues: BookingServiceValues[] = serviceItems.map((item) => ({
      service_id: item.service_id,
      name_snapshot: item.name_snapshot,
      description_snapshot: item.description_snapshot,
      unit_price_snapshot: item.unit_price_snapshot,
      quantity: item.quantity,
      track_completion_snapshot: item.track_completion_snapshot,
    }));
    await createBooking(values, serviceValues, itinerary, depositAlreadyPaid, addAnother);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">New Booking</h1>
      <BookingForm
        services={services}
        packages={packages}
        onSubmit={handleCreate}
      />
    </div>
  );
}
