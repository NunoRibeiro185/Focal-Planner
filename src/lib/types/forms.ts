/**
 * Zod schemas and inferred types for all forms.
 * Single source of truth for validation logic shared between
 * client-side forms and server-side actions.
 */
import { z } from "zod";

// ─── Package ─────────────────────────────────────────────────

export const packageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  description: z.string().nullable(),
  base_price: z.coerce.number().positive("Price must be positive"),
  currency: z.string().length(3, "Select a currency"),
  hours_of_coverage: z.coerce
    .number()
    .positive("Hours must be positive")
    .max(24),
  custom_fields: z
    .array(
      z.object({
        field_definition_id: z.string().uuid(),
        value_text: z.string().nullable(),
        value_bool: z.boolean().nullable(),
      })
    )
    .default([]),
});

export type PackageFormValues = z.infer<typeof packageFormSchema>;

// ─── Booking ─────────────────────────────────────────────────

export const LEAD_SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "weddingwire", label: "WeddingWire / WUN" },
  { value: "google", label: "Google" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
] as const;

export const bookingFormSchema = z.object({
  package_template_id: z.string().uuid("Select a package"),
  client_name_primary: z.string().min(1, "Primary client name is required"),
  client_name_secondary: z.string().nullable(),
  client_email: z.string().email("Invalid email").or(z.literal("")).nullable(),
  client_phone: z.string().nullable(),
  lead_source: z
    .enum(["instagram", "facebook", "weddingwire", "google", "referral", "other"])
    .nullable(),
  event_date: z.string().min(1, "Event date is required"),
  notes: z.string().nullable(),
  price_override: z.coerce.number().nullable(),
  hours_override: z.coerce.number().nullable(),
  deposit_amount: z.coerce.number().min(0).nullable(),
  payment_due_date: z.string().nullable(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

// ─── Payment ─────────────────────────────────────────────────

export const paymentEntrySchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paid_date: z.string().min(1, "Date is required"),
  note: z.string().nullable(),
});

export type PaymentEntryValues = z.infer<typeof paymentEntrySchema>;

// ─── Task ────────────────────────────────────────────────────

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  due_date: z.string().nullable(),
});

export type TaskValues = z.infer<typeof taskSchema>;

// ─── Extras catalog ───────────────────────────────────────────

export const extraSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  currency: z.string().length(3, "Select a currency"),
});

export type ExtraValues = z.infer<typeof extraSchema>;

export const bookingExtraSchema = z.object({
  extra_id: z.string().uuid().nullable(),
  name_snapshot: z.string().min(1, "Name is required"),
  price_snapshot: z.coerce.number().min(0, "Price must be 0 or more"),
  currency_snapshot: z.string().length(3),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export type BookingExtraValues = z.infer<typeof bookingExtraSchema>;

// ─── Custom field definitions ─────────────────────────────────

export const customFieldDefinitionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  field_type: z.enum(["checkbox", "text"]),
});

export type CustomFieldDefinitionValues = z.infer<typeof customFieldDefinitionSchema>;

// ─── Itinerary ────────────────────────────────────────────────

export interface ItineraryStopInput {
  name: string;
  address: string;
  start_time: string;
  notes: string;
}

// ─── Personal events ─────────────────────────────────────────

export const personalEventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  all_day: z.boolean().default(true),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  tag: z.string().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .default("#6366f1"),
  notes: z.string().nullable(),
});

export type PersonalEventFormValues = z.infer<typeof personalEventFormSchema>;

// ─── Quick booking (from calendar) ───────────────────────────

export const quickBookingFormSchema = z.object({
  client_name_primary: z.string().min(1, "Client name is required"),
  event_date: z.string().min(1, "Date is required"),
  package_template_id: z.string().uuid("Select a package"),
});

export type QuickBookingFormValues = z.infer<typeof quickBookingFormSchema>;

// ─── Settings ────────────────────────────────────────────────

export const settingsSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  default_currency: z.string().length(3),
});

export type SettingsValues = z.infer<typeof settingsSchema>;
