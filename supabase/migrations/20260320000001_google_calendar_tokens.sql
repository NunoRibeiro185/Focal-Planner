-- ============================================================
-- Google Calendar Tokens — one row per connected photographer
-- ============================================================

create table public.google_calendar_tokens (
  photographer_id        uuid primary key references public.photographers (id) on delete cascade,
  access_token           text not null,
  refresh_token          text not null,
  token_expiry           timestamptz not null,
  selected_calendar_id   text,
  selected_calendar_name text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Reuse the existing set_updated_at trigger function
create trigger google_calendar_tokens_set_updated_at
  before update on public.google_calendar_tokens
  for each row execute function public.set_updated_at();

alter table public.google_calendar_tokens enable row level security;

create policy "google_calendar_tokens: own row only"
  on public.google_calendar_tokens for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());
