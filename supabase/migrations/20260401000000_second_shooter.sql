-- ============================================================
-- Second Shooter Feature
-- ============================================================
-- Adds second shooter collaboration fields to bookings,
-- a private notes table, and updated RLS policies.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Extend bookings table
-- ─────────────────────────────────────────────────────────────

alter table public.bookings
  -- Account-holder link (null = no Focal account or not yet accepted)
  add column second_shooter_id             uuid references public.photographers(id) on delete set null,
  -- Email used for invite lookup / non-account reference
  add column second_shooter_email          text,
  -- Agreed fee for the second shooter
  add column second_shooter_fee            numeric(10,2),
  -- Hashed password for public page access (scrypt)
  add column second_shooter_password_hash  text,
  -- Free-form instructions from primary photographer to second shooter
  add column second_shooter_instructions   text,
  -- UUID token emailed to second shooter for one-time invite acceptance
  add column second_shooter_invite_token   uuid,
  -- Invite lifecycle: null = no invite sent, pending = sent, accepted = confirmed
  add column second_shooter_invite_status  text
    check (second_shooter_invite_status in ('pending', 'accepted')),
  -- Whether the second shooter can see client contact details (phone + email)
  add column second_shooter_show_client_contact boolean not null default false;

create index on public.bookings (second_shooter_id)
  where second_shooter_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 2. Second shooter private notes
--    One row per (booking, photographer) — second shooter's
--    private scratch pad, invisible to the primary photographer.
-- ─────────────────────────────────────────────────────────────

create table public.second_shooter_notes (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (booking_id, photographer_id)
);

create trigger second_shooter_notes_set_updated_at
  before update on public.second_shooter_notes
  for each row execute function public.set_updated_at();

alter table public.second_shooter_notes enable row level security;

-- Each photographer manages only their own notes row
create policy "second_shooter_notes: own rows"
  on public.second_shooter_notes for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. RLS — allow accepted second shooters to SELECT bookings
--    The existing "bookings: own rows" policy handles the
--    primary photographer. We add a second PERMISSIVE SELECT
--    policy so accepted second shooters can read the row too.
-- ─────────────────────────────────────────────────────────────

create policy "bookings: second shooter read"
  on public.bookings for select
  using (
    second_shooter_id = auth.uid()
    and second_shooter_invite_status = 'accepted'
  );

-- Second shooters also need to read the itinerary stops
create policy "booking_itinerary_stops: second shooter read"
  on public.booking_itinerary_stops for select
  using (
    booking_id in (
      select id from public.bookings
      where second_shooter_id = auth.uid()
        and second_shooter_invite_status = 'accepted'
    )
  );
