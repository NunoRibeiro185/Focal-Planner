-- ─────────────────────────────────────────────────────────────
-- Editing workflow & lead source
-- 1. editing_stage_templates — photographer's master stage list
-- 2. booking_editing_stages  — per-booking copy, created on
--    transition to `editing` status
-- 3. lead_source enum + column on bookings
-- ─────────────────────────────────────────────────────────────

-- ── 1. Lead source ───────────────────────────────────────────

create type public.lead_source as enum (
  'instagram',
  'facebook',
  'weddingwire',
  'google',
  'referral',
  'other'
);

alter table public.bookings
  add column lead_source public.lead_source;

-- ── 2. Editing stage templates ───────────────────────────────

create table public.editing_stage_templates (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  title           text not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index on public.editing_stage_templates (photographer_id, sort_order);

alter table public.editing_stage_templates enable row level security;

create policy "editing_stage_templates: own rows"
  on public.editing_stage_templates for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ── 3. Booking editing stages ────────────────────────────────
-- Per-booking copy of the template. Created when the booking
-- transitions to `editing`. Deleting from the template does NOT
-- cascade here — these rows are independent copies.

create table public.booking_editing_stages (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  title           text not null,
  sort_order      integer not null default 0,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index on public.booking_editing_stages (booking_id, sort_order);

alter table public.booking_editing_stages enable row level security;

create policy "booking_editing_stages: own rows"
  on public.booking_editing_stages for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
