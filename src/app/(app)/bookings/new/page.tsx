import { getPackageTemplates } from "@/lib/queries/packages";
import { getExtras } from "@/lib/queries/extras";
import { BookingForm } from "@/components/bookings/booking-form";
import { createBooking } from "@/lib/actions/bookings";
import type { BookingFormValues, BookingExtraValues, ItineraryStopInput } from "@/lib/types/forms";

export default async function NewBookingPage() {
  const [packages, catalogExtras] = await Promise.all([
    getPackageTemplates(),
    getExtras(),
  ]);

  async function handleCreate(
    values: BookingFormValues,
    extras: BookingExtraValues[],
    itinerary: ItineraryStopInput[]
  ) {
    "use server";
    await createBooking(values, extras, itinerary);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">New Booking</h1>
      <BookingForm
        packages={packages}
        catalogExtras={catalogExtras}
        onSubmit={handleCreate}
      />
    </div>
  );
}
