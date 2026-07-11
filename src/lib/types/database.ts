/**
 * App-facing database types.
 *
 * The base row/enum types are aliases of the *generated* Supabase schema in
 * `./supabase.ts` (produced by `npm run db:types`). Regenerate that file after
 * every migration. This module layers convenience helpers, app-level unions for
 * TEXT+CHECK columns that PostgREST reports as plain `string`, and the enriched
 * view-model interfaces used across the UI.
 */
import type { Database } from "./supabase";

export type { Database };

// ─── Generic helpers over the generated schema ───────────────
type PublicTables = Database["public"]["Tables"];
export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type Insert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type Update<T extends keyof PublicTables> = PublicTables[T]["Update"];
type Enums = Database["public"]["Enums"];

// ─── Enums (from the DB) ─────────────────────────────────────
export type BookingStatus = Enums["booking_status"];
export type LeadSource = Enums["lead_source"];
export type DeliverableKey = Enums["deliverable_key"];
export type ExpenseCategory = Enums["expense_category"];
export type ExpensePaidBy = Enums["expense_paid_by"];
export type SubscriptionStatus = Enums["subscription_status"];
export type SubscriptionPlan = Enums["subscription_plan"];

// ─── App-level unions for TEXT+CHECK columns ─────────────────
// These columns are plain `text` in the DB (with a CHECK constraint), so the
// generated types report them as `string`. Narrow app-level aliases for use at
// call sites that need the specific values.
export type ItineraryCreatedBy = "photographer" | "client";
export type SecondShooterInviteStatus = "pending" | "accepted";

// ─── Base row types (aliases of generated rows) ──────────────
export type Photographer = Row<"photographers">;
export type PackageTemplate = Row<"package_templates">;
export type PackageVersion = Row<"package_versions">;
export type Booking = Row<"bookings">;
export type InquiryForm = Row<"inquiry_forms">;
export type InquiryFormField = Row<"inquiry_form_fields">;
export type InquiryFormFieldOption = Row<"inquiry_form_field_options">;
export type InquiryAnswer = Row<"inquiry_answers">;
export type SecondShooterNote = Row<"second_shooter_notes">;
export type PaymentLogEntry = Row<"payment_log_entries">;
export type DeliverableStatus = Row<"deliverable_statuses">;
export type TaskTemplate = Row<"task_templates">;
export type Extra = Row<"extras">;
export type BookingExtra = Row<"booking_extras">;
export type CustomFieldDefinition = Row<"custom_field_definitions">;
export type PackageVersionCustomField = Row<"package_version_custom_fields">;
export type BookingTask = Row<"booking_tasks">;
export type Expense = Row<"expenses">;
export type BookingItineraryStop = Row<"booking_itinerary_stops">;
export type PersonalEvent = Row<"personal_events">;
export type Subscription = Row<"subscriptions">;
export type SubscriptionInsert = Insert<"subscriptions">;
export type GoogleCalendarToken = Row<"google_calendar_tokens">;
export type EditingStageTemplate = Row<"editing_stage_templates">;
export type BookingEditingStage = Row<"booking_editing_stages">;
export type BookingDeliverableProgress = Row<"booking_deliverable_progress">;

// Deal room rows
export type DealRoomProposalRow = Row<"deal_room_proposals">;
export type DealRoomCounterOfferRow = Row<"deal_room_counter_offers">;
export type DealRoomQuestionRow = Row<"deal_room_questions">;
export type DealRoomAnswerRow = Row<"deal_room_answers">;

export type { Service, BookingService, PackageTemplateService, PackageTemplateWithServices } from "./services";

// ─── Joined/enriched view models used in the UI ──────────────

export interface PackageTemplateWithVersion extends PackageTemplate {
  current_version: PackageVersion | null;
}

export interface PackageVersionCustomFieldWithDefinition
  extends PackageVersionCustomField {
  definition: Pick<CustomFieldDefinition, "label" | "field_type" | "description">;
}

export interface PackageVersionWithCustomFields extends PackageVersion {
  custom_fields: PackageVersionCustomFieldWithDefinition[];
}

export interface PackageTemplateWithVersionAndCustomFields
  extends PackageTemplate {
  current_version: PackageVersionWithCustomFields | null;
}

export interface PackageVersionWithBookingCount extends PackageVersion {
  booking_count: number;
}

export interface PackageTemplateForList extends PackageTemplate {
  current_version: PackageVersionWithCustomFields | null;
  all_versions: PackageVersionWithBookingCount[];
  services: Array<{ default_quantity: number; service: { unit_price: number } }>;
}

export interface PackageTemplateForBooking extends PackageTemplate {
  current_version: PackageVersion | null;
  all_versions: PackageVersion[];
}

export interface BookingWithVersion extends Booking {
  package_version: PackageVersion | null;
}

export interface BookingWithExtras extends Booking {
  extras: BookingExtra[];
}

// ─── Unified calendar event type ─────────────────────────────

export type CalendarEvent =
  | {
      kind: "booking";
      id: string;
      title: string;
      start: string;
      end: string;
      allDay: boolean;
      color: string;
      status: BookingStatus;
      bookingId: string;
      clientName: string;
      venueName: string | null;
      startTime: string | null;
      hoursOfCoverage: number | null;
      totalPrice: number;
      currency: string;
    }
  | {
      kind: "personal";
      id: string;
      title: string;
      start: string;
      end: string;
      allDay: boolean;
      color: string;
      tag: string | null;
      personalEventId: string;
    };
