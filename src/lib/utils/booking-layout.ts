import type { BookingStatus } from "@/lib/types";

/**
 * Every panel that can appear on the booking detail page.
 * client_info is a first-class panel — no longer implicitly tied to other panels.
 */
export type BookingPanel =
  | "availability_calendar"
  | "client_info"
  | "notes"
  | "package_extras"
  | "itinerary"
  | "payment"
  | "tasks"
  | "deliverables"
  | "editing_pipeline"
  | "second_shooter";

/**
 * A single widget slot within a layout row.
 * forceShow: render even when content is empty (used for notes on inquiry/confirmed).
 * weight: column span relative to other slots in the same row (default 1).
 *   e.g. [{ panel: "foo", weight: 2 }, { panel: "bar", weight: 1 }]
 *   gives foo 2/3 of the row and bar 1/3.
 */
export interface PanelSlot {
  panel: BookingPanel;
  forceShow?: boolean;
  weight?: number;
}

/**
 * A horizontal row of widgets.
 * - 1 slot  → full width
 * - 2 slots → side-by-side halves
 * - 3 slots → equal thirds
 */
export interface LayoutSection {
  slots: PanelSlot[];
}

/**
 * A complete, independent page composition for one booking status.
 * Each status owns its own layout — nothing is shared or inherited.
 */
export interface BookingLayoutConfig {
  sections: LayoutSection[];
}

// ─── Per-status layouts ───────────────────────────────────────────────────────

/**
 * Inquiry: evaluating a lead.
 * Priority: who is asking, when, are you free, what do they want.
 */
const INQUIRY_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "client_info" }, { panel: "availability_calendar" }, { panel: "itinerary" }] },
    { slots: [{ panel: "tasks" }, { panel: "notes", forceShow: true }] },
    { slots: [{ panel: "package_extras" }, { panel: "payment" }] },
  ],
};

/**
 * Confirmed: shoot is locked in.
 * Priority: logistics — itinerary and tasks front and centre.
 */
const CONFIRMED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "availability_calendar" }, { panel: "notes", forceShow: true }] },
    { slots: [{ panel: "client_info" }, { panel: "itinerary" }, { panel: "package_extras" }] },
    { slots: [{ panel: "tasks" }, { panel: "payment" }] },
    { slots: [{ panel: "second_shooter" }] },
  ],
};

/**
 * Shoot completed: day is done, raw files in hand.
 * Priority: post-shoot checklist and confirming payment.
 */
const SHOOT_COMPLETED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "tasks" }, { panel: "payment" }] },
    { slots: [{ panel: "client_info" }, { panel: "package_extras" }] },
    { slots: [{ panel: "notes" }] },
    { slots: [{ panel: "second_shooter" }] },
  ],
};

/**
 * Editing: in post-production.
 * Priority: editing pipeline progress, then admin.
 */
const EDITING_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "editing_pipeline" }] },
    { slots: [{ panel: "payment" }, { panel: "tasks" }] },
    { slots: [{ panel: "package_extras" }, { panel: "notes" }] },
  ],
};

/**
 * Delivered: gallery sent, awaiting final payments and physical deliverables.
 * Priority: what's been paid, what's been handed over.
 */
const DELIVERED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "payment" }, { panel: "deliverables" }] },
    { slots: [{ panel: "client_info" }, { panel: "package_extras" }] },
    { slots: [{ panel: "tasks" }, { panel: "notes" }] },
  ],
};

/**
 * Done / Cancelled: read-only archive.
 * Show everything for reference — no availability calendar or editing pipeline.
 */
const ARCHIVE_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "client_info" }, { panel: "itinerary" }] },
    { slots: [{ panel: "payment" }, { panel: "deliverables" }] },
    { slots: [{ panel: "package_extras" }, { panel: "tasks" }] },
    { slots: [{ panel: "notes" }] },
  ],
};

// ─── Fallback ─────────────────────────────────────────────────────────────────

const DEFAULT_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "client_info" }, { panel: "itinerary" }] },
    { slots: [{ panel: "payment" }, { panel: "deliverables" }] },
    { slots: [{ panel: "package_extras" }, { panel: "tasks" }] },
    { slots: [{ panel: "notes" }] },
  ],
};

const LAYOUT_MAP: Partial<Record<BookingStatus, BookingLayoutConfig>> = {
  inquiry: INQUIRY_LAYOUT,
  confirmed: CONFIRMED_LAYOUT,
  shoot_completed: SHOOT_COMPLETED_LAYOUT,
  editing: EDITING_LAYOUT,
  delivered: DELIVERED_LAYOUT,
  done: ARCHIVE_LAYOUT,
  cancelled: ARCHIVE_LAYOUT,
};

export function resolveBookingLayout(status: BookingStatus): BookingLayoutConfig {
  return LAYOUT_MAP[status] ?? DEFAULT_LAYOUT;
}

// ─── Helpers for testing and data access ─────────────────────────────────────

/** Returns every panel declared in the layout, in section/slot order. */
export function getAllPanels(config: BookingLayoutConfig): BookingPanel[] {
  return config.sections.flatMap((s) => s.slots.map((slot) => slot.panel));
}

/** Returns true if the given panel is marked forceShow anywhere in the layout. */
export function isForceShown(
  config: BookingLayoutConfig,
  panel: BookingPanel
): boolean {
  return config.sections.some((s) =>
    s.slots.some((slot) => slot.panel === panel && slot.forceShow)
  );
}
