import { BookingForm } from "@/components/bookings/booking-form";
import { createInquiry } from "@/lib/actions/bookings";
import type { BookingFormValues, ItineraryStopInput } from "@/lib/types/forms";
import type { BuilderLineItem } from "@/lib/utils/booking-builder";

export default async function NewInquiryPage() {
  async function handleCreate(
    values: BookingFormValues,
    _serviceItems: BuilderLineItem[],
    itinerary: ItineraryStopInput[]
  ) {
    "use server";
    await createInquiry(values, itinerary);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">New Inquiry</h1>
      <BookingForm
        services={[]}
        packages={[]}
        onSubmit={handleCreate}
        hideBuilder
        mode="inquiry"
      />
    </div>
  );
}
