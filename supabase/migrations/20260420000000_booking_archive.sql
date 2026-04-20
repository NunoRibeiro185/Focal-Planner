-- Add is_archived flag to bookings
-- Archived bookings are hidden from the main list and shown in a dedicated tab.
-- Auto-archiving happens at the application layer when status transitions to 'done' or 'cancelled'.

alter table public.bookings
  add column if not exists is_archived boolean not null default false;

create index if not exists bookings_is_archived_idx
  on public.bookings (photographer_id, is_archived);
