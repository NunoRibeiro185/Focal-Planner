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
 * Priority: am I free (calendar), who is asking (client), what do they want (itinerary).
 * Row 1: equal thirds — three distinct questions, no single one dominates yet.
 * Notes get 2/3 of row 2 — first impressions and requirements deserve space.
 * Package/extras wider than payment — the quote is what closes the deal.
 *
 * All rows use total weight ≤ 3 so columns stay readable.
 */
const INQUIRY_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "client_info" },
      { panel: "availability_calendar" },
      { panel: "itinerary" },
    ]},
    { slots: [
      { panel: "tasks", weight: 1 },
      { panel: "notes", forceShow: true, weight: 2 },
    ]},
    { slots: [
      { panel: "package_extras", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
  ],
};

/**
 * Confirmed: shoot is locked in.
 * Priority: the shoot brief (notes), then logistics (itinerary, tasks), then admin.
 * Notes lead row 1 at 2/3 — the brief is what the photographer re-reads before every shoot.
 * Row 2: equal thirds for client/itinerary/package — all useful day-of reference.
 * Tasks wider than payment in row 3 — pre-shoot prep is the active work.
 */
const CONFIRMED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "notes", forceShow: true, weight: 2 },
      { panel: "availability_calendar", weight: 1 },
    ]},
    { slots: [
      { panel: "client_info" },
      { panel: "itinerary" },
      { panel: "package_extras" },
    ]},
    { slots: [
      { panel: "tasks", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
    { slots: [{ panel: "second_shooter" }] },
  ],
};

/**
 * Shoot completed: day is done, raw files in hand.
 * Priority: post-shoot checklist (tasks), confirming payment.
 * Tasks wider — there's more to close out than just confirming a number.
 * Package wider in row 2 — confirms what was actually shot on the day.
 */
const SHOOT_COMPLETED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "tasks", weight: 2 },
      { panel: "payment", weight: 1 },
    ]},
    { slots: [
      { panel: "client_info", weight: 1 },
      { panel: "package_extras", weight: 2 },
    ]},
    { slots: [{ panel: "notes" }] },
    { slots: [{ panel: "second_shooter" }] },
  ],
};

/**
 * Editing: in post-production.
 * Priority: editing pipeline progress, then admin.
 * Pipeline is full-width — it IS the work at this stage.
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
 * Priority: financial closure (payment), handover confirmation (deliverables).
 * Payment wider — the final amount, balance, and log is what needs attention.
 * Package wider in row 2 — confirms what was included in the delivered gallery.
 */
const DELIVERED_LAYOUT: BookingLayoutConfig = {
  sections: [
    { slots: [
      { panel: "payment", weight: 2 },
      { panel: "deliverables", weight: 1 },
    ]},
    { slots: [
      { panel: "client_info", weight: 1 },
      { panel: "package_extras", weight: 2 },
    ]},
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
