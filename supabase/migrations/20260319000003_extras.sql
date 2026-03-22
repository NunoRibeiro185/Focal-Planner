-- ─────────────────────────────────────────────────────────────
-- Extras catalog (photographer-scoped, soft-deletable)
-- ─────────────────────────────────────────────────────────────
create table public.extras (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric(10,2) not null,
  currency        char(3) not null,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index on public.extras (photographer_id);

alter table public.extras enable row level security;

create policy "extras: own rows"
  on public.extras for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Booking extras (price/name snapshotted at add time)
-- ─────────────────────────────────────────────────────────────
create table public.booking_extras (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings (id) on delete cascade,
  photographer_id   uuid not null references public.photographers (id) on delete cascade,
  -- Nullable: null means this is a one-off custom extra (not from catalog)
  extra_id          uuid references public.extras (id) on delete set null,
  -- Immutable snapshots taken at the time of adding
  name_snapshot     text not null,
  price_snapshot    numeric(10,2) not null,
  currency_snapshot char(3) not null,
  quantity          integer not null default 1 check (quantity > 0),
  created_at        timestamptz not null default now()
);

create index on public.booking_extras (booking_id);

alter table public.booking_extras enable row level security;

create policy "booking_extras: own rows"
  on public.booking_extras for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
