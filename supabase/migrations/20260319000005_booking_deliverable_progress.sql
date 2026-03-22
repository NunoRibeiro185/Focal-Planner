-- ─────────────────────────────────────────────────────────────
-- Per-booking progress tracking for custom checkbox deliverables.
-- One row per (booking, package_version_custom_field) pair.
-- Created when a booking is created; toggled via server action.
-- ─────────────────────────────────────────────────────────────
create table public.booking_deliverable_progress (
  id                              uuid primary key default gen_random_uuid(),
  booking_id                      uuid not null references public.bookings (id) on delete cascade,
  photographer_id                 uuid not null references public.photographers (id) on delete cascade,
  package_version_custom_field_id uuid not null references public.package_version_custom_fields (id),
  label                           text not null,
  done                            boolean not null default false,
  created_at                      timestamptz not null default now(),
  unique (booking_id, package_version_custom_field_id)
);

create index on public.booking_deliverable_progress (booking_id);

alter table public.booking_deliverable_progress enable row level security;

create policy "booking_deliverable_progress: own rows"
  on public.booking_deliverable_progress for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
