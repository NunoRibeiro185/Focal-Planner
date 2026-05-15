export interface BuilderLineItem {
  service_id: string | null;
  name_snapshot: string;
  description_snapshot: string | null;
  unit_price_snapshot: number;
  quantity: number;
  track_completion_snapshot: boolean;
}

export interface BookingServiceInsertRow {
  booking_id: string;
  photographer_id: string;
  service_id: string | null;
  name_snapshot: string;
  description_snapshot: string | null;
  unit_price_snapshot: number;
  quantity: number;
  track_completion_snapshot: boolean;
  done: boolean;
  sort_order: number;
}

export function computeSubtotal(items: BuilderLineItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.unit_price_snapshot * item.quantity,
    0
  );
}

export function computeFinalPrice(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

export function toBookingServiceInserts(
  items: BuilderLineItem[],
  bookingId: string,
  photographerId: string
): BookingServiceInsertRow[] {
  return items.map((item, index) => ({
    booking_id: bookingId,
    photographer_id: photographerId,
    service_id: item.service_id,
    name_snapshot: item.name_snapshot,
    description_snapshot: item.description_snapshot ?? null,
    unit_price_snapshot: item.unit_price_snapshot,
    quantity: item.quantity,
    track_completion_snapshot: item.track_completion_snapshot,
    done: false,
    sort_order: index,
  }));
}
