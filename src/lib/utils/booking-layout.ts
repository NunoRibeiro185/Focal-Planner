import type { BookingStatus } from "@/lib/types";

/**
 * The full set of panels that can appear on the booking detail page.
 * Each key maps to a component that the page conditionally renders.
 */
export type BookingPanel =
  | "editing_pipeline"
  | "package"
  | "schedule"
  | "itinerary"
  | "payment"
  | "extras"
  | "tasks"
  | "deliverables";

export interface BookingLayoutConfig {
  panels: BookingPanel[];
}

/**
 * Default layout — shown for all statuses that don't have a custom layout.
 * Mirrors the existing booking detail page panel order.
 */
const DEFAULT_LAYOUT: BookingLayoutConfig = {
  panels: [
    "package",
    "schedule",
    "itinerary",
    "payment",
    "deliverables",
    "extras",
    "tasks",
  ],
};

/**
 * Layout shown when a booking is in "editing" status.
 * Promotes the editing pipeline to the top; hides package, schedule,
 * itinerary, and deliverables as they are irrelevant during post-production.
 */
const EDITING_LAYOUT: BookingLayoutConfig = {
  panels: ["editing_pipeline", "payment", "extras", "tasks"],
};

const LAYOUT_MAP: Partial<Record<BookingStatus, BookingLayoutConfig>> = {
  editing: EDITING_LAYOUT,
};

/**
 * Returns the panel configuration for the given booking status.
 * Falls back to the default layout for any status not explicitly mapped.
 */
export function resolveBookingLayout(
  status: BookingStatus
): BookingLayoutConfig {
  return LAYOUT_MAP[status] ?? DEFAULT_LAYOUT;
}
