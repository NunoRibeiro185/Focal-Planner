-- ============================================================
-- Personal Events — non-booking calendar entries
-- (vacation, travel, editing days, etc.)
-- ============================================================

create table public.personal_events (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  title           text not null,
  start_date      date not null,
  end_date        date not null,
  all_day         boolean not null default true,
  start_time      time,
  end_time        time,
  tag             text,
  color           char(7) not null default '#6366f1',
  notes           text,
  google_event_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Reuse the existing set_updated_at trigger function
create trigger personal_events_set_updated_at
  before update on public.personal_events
  for each row execute function public.set_updated_at();

create index on public.personal_events (photographer_id, start_date, end_date);

alter table public.personal_events enable row level security;

create policy "personal_events: own rows"
  on public.personal_events for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
