-- ============================================================
-- Add google_event_id to bookings for Google Calendar sync
-- ============================================================

alter table public.bookings
  add column google_event_id text;
