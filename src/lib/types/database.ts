/**
 * Type-safe representation of the Supabase database schema.
 * Keep in sync with supabase/migrations/001_initial_schema.sql.
 */
import type { Service, BookingService, PackageTemplateService } from "./services";

export type BookingStatus =
  | "inquiry"
  | "confirmed"
  | "shoot_completed"
  | "editing"
  | "delivered"
  | "done"
  | "cancelled";

export type LeadSource =
  | "instagram"
  | "facebook"
  | "google"
  | "referral"
  | "other"
  | "inquiry_form";


export type DeliverableKey =
  | "edited_photos"
  | "wedding_album"
  | "film_rolls"
  | "video"
  | "short_clips"
  | "second_shooter";

export type ExpenseCategory =
  | "equipment"
  | "travel"
  | "accommodation"
  | "food"
  | "software_tools"
  | "film"
  | "second_shooter"
  | "other";

export type ExpensePaidBy = "photographer" | "client";

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "paused";
export type SubscriptionPlan = "monthly" | "annual";

// ─── Row types ───────────────────────────────────────────────

export interface Photographer {
  id: string;
  email: string;
  full_name: string | null;
  default_currency: string;
  created_at: string;
  slug: string | null;
  trial_warning_sent_at: string | null;
  inquiry_form_enabled: boolean;
  inquiry_show_packages: boolean;
  inquiry_show_prices: boolean;
  inquiry_show_phone: boolean;
  inquiry_show_secondary_name: boolean;
  inquiry_show_event_date: boolean;
  inquiry_show_venue: boolean;
  inquiry_show_location: boolean;
  inquiry_show_notes: boolean;
}


export interface PackageTemplate {
  id: string;
  photographer_id: string;
  name: string;
  current_version_id: string | null;
  archived: boolean;
  created_at: string;
}

export interface PackageVersion {
  id: string;
  package_template_id: string;
  photographer_id: string;
  version_number: number;
  version_name: string;
  base_price: number;
  currency: string;
  hours_of_coverage: number;
  description: string | null;
  archived: boolean;
  created_at: string;
}

export type SecondShooterInviteStatus = "pending" | "accepted";

export interface Booking {
  id: string;
  photographer_id: string;
  package_version_id: string | null;
  client_name_primary: string;
  client_name_secondary: string | null;
  client_email: string | null;
  client_phone: string | null;
  venue_name: string | null;
  venue_address: string | null;
  event_date: string | null;
  start_time: string | null;
  duration_hours: number | null;
  notes: string | null;
  status: BookingStatus;
  price_override: number | null;
  hours_override: number | null;
  total_price: number;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_date: string | null;
  payment_due_date: string | null;
  google_event_id: string | null;
  lead_source: LeadSource | null;
  location: string | null;
  // Second shooter collaboration
  second_shooter_id: string | null;
  second_shooter_email: string | null;
  second_shooter_fee: number | null;
  second_shooter_password_hash: string | null;
  second_shooter_instructions: string | null;
  second_shooter_invite_token: string | null;
  second_shooter_invite_status: SecondShooterInviteStatus | null;
  second_shooter_show_client_contact: boolean;
  inquiry_form_id: string | null;
  inquiry_form_name_snapshot: string | null;
  is_archived: boolean;
  discount_amount: number;
  created_at: string;
  updated_at: string;
  client_token: string;
}

export interface InquiryForm {
  id: string;
  photographer_id: string;
  name: string;
  form_url: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryFormField {
  id: string;
  form_id: string;
  photographer_id: string;
  field_type: string;
  label: string;
  helper_text: string | null;
  is_required: boolean;
  sort_order: number;
  field_mapping: string | null;
  created_at: string;
}

export interface InquiryFormFieldOption {
  id: string;
  field_id: string;
  label: string;
  sort_order: number;
}

export interface InquiryAnswer {
  id: string;
  booking_id: string;
  question_text: string;
  answer_value: string;
  sort_order: number;
  created_at: string;
}

export interface SecondShooterNote {
  id: string;
  booking_id: string;
  photographer_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLogEntry {
  id: string;
  booking_id: string;
  photographer_id: string;
  amount: number;
  paid_date: string;
  note: string | null;
  created_at: string;
}

export interface DeliverableStatus {
  id: string;
  booking_id: string;
  photographer_id: string;
  deliverable_key: DeliverableKey;
  status: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  photographer_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Extra {
  id: string;
  photographer_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  deleted_at: string | null;
  created_at: string;
}

export type { Service, BookingService, PackageTemplateService, PackageTemplateWithServices } from "./services";

export interface BookingExtra {
  id: string;
  booking_id: string;
  photographer_id: string;
  extra_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  currency_snapshot: string;
  quantity: number;
  created_at: string;
}

export interface CustomFieldDefinition {
  id: string;
  photographer_id: string;
  label: string;
  description: string | null;
  field_type: "checkbox" | "text";
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
}

export interface PackageVersionCustomField {
  id: string;
  package_version_id: string;
  field_definition_id: string;
  photographer_id: string;
  value_text: string | null;
  value_bool: boolean | null;
}

export interface BookingTask {
  id: string;
  booking_id: string | null;
  photographer_id: string;
  template_id: string | null;
  title: string;
  done: boolean;
  due_date: string | null;
  sort_order: number;
  created_at: string;
}

// ─── Joined/enriched types used in the UI ────────────────────

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

export interface Expense {
  id: string;
  photographer_id: string;
  booking_id: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  vat_percentage: number | null;
  paid_by: ExpensePaidBy;
  reimbursed: boolean;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingItineraryStop {
  id: string;
  booking_id: string;
  photographer_id: string;
  name: string;
  address: string | null;
  start_time: string | null;
  notes: string | null;
  sort_order: number;
  created_by: "photographer" | "client";
}

export interface PersonalEvent {
  id: string;
  photographer_id: string;
  title: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  tag: string | null;
  color: string;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  photographer_id: string;
  lemon_squeezy_subscription_id: string;
  lemon_squeezy_customer_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  price_locked: boolean;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInsert {
  photographer_id: string;
  lemon_squeezy_subscription_id: string;
  lemon_squeezy_customer_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  price_locked: boolean;
  current_period_end: string;
  created_at?: string;
  updated_at?: string;
}

export interface GoogleCalendarToken {
  photographer_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  selected_calendar_id: string | null;
  selected_calendar_name: string | null;
  created_at: string;
  updated_at: string;
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

export interface EditingStageTemplate {
  id: string;
  photographer_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface BookingEditingStage {
  id: string;
  booking_id: string;
  photographer_id: string;
  title: string;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface BookingDeliverableProgress {
  id: string;
  booking_id: string;
  photographer_id: string;
  package_version_custom_field_id: string;
  label: string;
  description: string | null;
  done: boolean;
  created_at: string;
}

// ─── Database interface for Supabase client generic ──────────

export interface Database {
  public: {
    Tables: {
      photographers: { Row: Photographer };
      package_templates: { Row: PackageTemplate };
      package_versions: { Row: PackageVersion };
      bookings: { Row: Booking };
      payment_log_entries: { Row: PaymentLogEntry };
      deliverable_statuses: { Row: DeliverableStatus };
      task_templates: { Row: TaskTemplate };
      booking_tasks: { Row: BookingTask };
      custom_field_definitions: { Row: CustomFieldDefinition };
      package_version_custom_fields: { Row: PackageVersionCustomField };
      extras: { Row: Extra };
      booking_extras: { Row: BookingExtra };
      services: { Row: Service };
      booking_services: { Row: BookingService };
      package_template_services: { Row: PackageTemplateService };
      booking_deliverable_progress: { Row: BookingDeliverableProgress };
      booking_itinerary_stops: { Row: BookingItineraryStop };
      personal_events: { Row: PersonalEvent };
      google_calendar_tokens: { Row: GoogleCalendarToken };
      editing_stage_templates: { Row: EditingStageTemplate };
      booking_editing_stages: { Row: BookingEditingStage };
      second_shooter_notes: { Row: SecondShooterNote };
      expenses: { Row: Expense };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: Partial<SubscriptionInsert>;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      deliverable_key: DeliverableKey;
      lead_source: LeadSource;
      expense_category: ExpenseCategory;
      expense_paid_by: ExpensePaidBy;
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
    };

    Functions: {
      submit_inquiry_public: {
        Args: {
          p_slug: string;
          p_client_name_primary: string;
          p_client_email: string;
          p_client_name_secondary?: string | null;
          p_client_phone?: string | null;
          p_event_date?: string | null;
          p_venue_name?: string | null;
          p_venue_address?: string | null;
          p_location?: string | null;
          p_package_template_id?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
    };
  };
}
