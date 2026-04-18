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
//
// Height classes (approximate):
//   always tall  : availability_calendar (~350px), payment with log (~400px+)
//   grows tall   : notes, tasks, itinerary, editing_pipeline
//   short-medium : client_info (~160px), deliverables (~180px), second_shooter (~180px)
//   medium       : package_extras (~200-300px)
//
// Rule: pair panels of similar height in the same row. Tall panels that have no
// equally-tall partner go full-width alone so there is no height gap beside them.

/**
 * Inquiry: evaluating a lead.
 * Primary question: am I free? Secondary: who/where, what's the quote.
 *
 * Row 1: calendar(2) + notes(1) — both tall/growable. Calendar is the primary check;
 *         notes (forceShow) captures first impressions alongside it.
 * Row 2: client_info + itinerary — both short, well matched.
 * Row 3: package_extras(2) + payment(1) — quote context + deposit terms.
 * Row 4: tasks — full width, follow-up action items.
 */
const INQUIRY_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "availability_calendar", weight: 2 },
      { panel: "notes", forceShow: true, weight: 1 },
    ]},
    { slots: [
      { panel: "client_info" },
      { panel: "itinerary" },
    ]},
    { slots: [
      { panel: "package_extras", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
    { slots: [{ panel: "tasks" }] },
  ],
};

/**
 * Confirmed: shoot is locked in.
 * Primary: shoot brief + logistics. Secondary: admin.
 *
 * Row 1: notes(2) + calendar(1) — brief leads. Notes will be filled (it's the shoot brief);
 *         height matches the calendar well when content is present.
 * Row 2: itinerary(2) + client_info(1) — day-of sequence wider, contact reference narrower.
 * Row 3: tasks(2) + payment(1) — pre-shoot prep wider, payment is reference.
 * Row 4: package_extras + second_shooter — both medium height, administrative reference.
 */
const CONFIRMED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "notes", forceShow: true, weight: 2 },
      { panel: "availability_calendar", weight: 1 },
    ]},
    { slots: [
      { panel: "itinerary", weight: 2 },
      { panel: "client_info", weight: 1 },
    ]},
    { slots: [
      { panel: "tasks", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
    { slots: [
      { panel: "package_extras" },
      { panel: "second_shooter" },
    ]},
  ],
};

/**
 * Shoot completed: day is done, raw files in hand.
 * Primary: close out tasks and confirm payment. Secondary: reference.
 *
 * Row 1: tasks(2) + payment(1) — both grow tall, close in height.
 * Row 2: package_extras(2) + client_info(1) — what was shot + who.
 * Row 3: notes + second_shooter — full-width pair of wrap-up panels.
 */
const SHOOT_COMPLETED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "tasks", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
    { slots: [
      { panel: "package_extras", weight: 2 },
      { panel: "client_info", weight: 1 },
    ]},
    { slots: [
      { panel: "notes" },
      { panel: "second_shooter" },
    ]},
  ],
};

/**
 * Editing: in post-production.
 * Primary: pipeline progress. Secondary: tasks, then admin.
 *
 * Row 1: editing_pipeline — full width. This IS the stage.
 * Row 2: tasks(2) + payment(1) — active editing tasks wider; payment is reference.
 * Row 3: notes + package_extras — equal; both reference panels.
 */
const EDITING_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "editing_pipeline" }] },
    { slots: [
      { panel: "tasks", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
    { slots: [
      { panel: "notes" },
      { panel: "package_extras" },
    ]},
  ],
};

/**
 * Delivered: gallery sent, awaiting final payment and physical handover.
 * Primary: financial closure. Secondary: handover confirmation, then reference.
 *
 * Row 1: payment — full width alone. It's the tallest panel in the app (totals + log)
 *         and the single most important thing at this stage. No partner can match its height.
 * Row 2: deliverables + client_info — both short (~180px), well matched.
 *         "What have I handed over, to whom?"
 * Row 3: package_extras(2) + tasks(1) — what was included, any remaining items.
 * Row 4: notes — full width, final observations.
 */
const DELIVERED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [{ panel: "payment" }] },
    { slots: [
      { panel: "deliverables" },
      { panel: "client_info" },
    ]},
    { slots: [
      { panel: "package_extras", weight: 2 },
      { panel: "tasks", weight: 1 },
    ]},
    { slots: [{ panel: "notes" }] },
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
