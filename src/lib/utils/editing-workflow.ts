import type { BookingEditingStage } from "@/lib/types";

/**
 * Computes the editing progress percentage for a booking.
 * Returns a value between 0 and 100.
 * Returns 0 for an empty stage list.
 */
export function computeEditingProgress(stages: BookingEditingStage[]): number {
  if (stages.length === 0) return 0;
  const completed = stages.filter((s) => s.completed_at !== null).length;
  return Math.round((completed / stages.length) * 100);
}

/**
 * Returns true if the photographer has at least one editing stage template
 * configured. Accepts the template list so the caller controls data fetching.
 */
export function hasEditingStagesConfigured(templateCount: number): boolean {
  return templateCount > 0;
}

/**
 * Builds the per-booking stage rows to insert when a booking transitions
 * to "editing". Copies titles and sort_order from the templates; the caller
 * is responsible for inserting these into the database.
 */
export function buildBookingStagesFromTemplates(
  templates: { id: string; title: string; sort_order: number }[],
  bookingId: string,
  photographerId: string
): Omit<BookingEditingStage, "id" | "created_at">[] {
  return templates.map((t) => ({
    booking_id: bookingId,
    photographer_id: photographerId,
    title: t.title,
    sort_order: t.sort_order,
    completed_at: null,
  }));
}
