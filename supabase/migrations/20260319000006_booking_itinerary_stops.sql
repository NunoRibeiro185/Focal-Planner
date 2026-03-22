-- ─────────────────────────────────────────────────────────────
-- Itinerary stops for a booking.
-- A booking can have multiple locations (getting-ready venue,
-- ceremony, reception, etc.), each with its own timing.
-- ─────────────────────────────────────────────────────────────
create table public.booking_itinerary_stops (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  name            text not null,
  address         text,
  start_time      text,
  notes           text,
  sort_order      int  not null default 0
);

create index on public.booking_itinerary_stops (booking_id);

alter table public.booking_itinerary_stops enable row level security;

create policy "booking_itinerary_stops: own rows"
  on public.booking_itinerary_stops for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
