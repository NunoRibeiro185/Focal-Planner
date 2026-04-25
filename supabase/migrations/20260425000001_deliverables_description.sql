-- Add description to deliverable catalog entries
ALTER TABLE public.custom_field_definitions
  ADD COLUMN description text;

-- Add description snapshot to per-booking progress rows
ALTER TABLE public.booking_deliverable_progress
  ADD COLUMN description text;
