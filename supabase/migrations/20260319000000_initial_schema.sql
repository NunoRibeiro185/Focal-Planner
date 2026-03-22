-- ============================================================
-- Photography Business Planner — Initial Schema
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Photographer profiles (one row per auth.users entry)
-- ─────────────────────────────────────────────────────────────
create table public.photographers (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  full_name       text,
  default_currency char(3) not null default 'EUR',
  created_at      timestamptz not null default now()
);

-- Auto-create a profile row on first sign-in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.photographers (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. Package templates (mutable "live" record)
-- ─────────────────────────────────────────────────────────────
create table public.package_templates (
  id                  uuid primary key default gen_random_uuid(),
  photographer_id     uuid not null references public.photographers (id) on delete cascade,
  name                text not null,
  current_version_id  uuid,             -- set after first version is created
  archived            boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. Package versions (immutable snapshots — never updated)
-- ─────────────────────────────────────────────────────────────
create table public.package_versions (
  id                    uuid primary key default gen_random_uuid(),
  package_template_id   uuid not null references public.package_templates (id) on delete cascade,
  photographer_id       uuid not null references public.photographers (id) on delete cascade,
  version_number        integer not null,
  -- Pricing
  base_price            numeric(10,2) not null,
  currency              char(3) not null,
  -- Coverage
  hours_of_coverage     numeric(4,1) not null,
  -- Deliverables
  edited_photos_count   integer,
  wedding_album         boolean not null default false,
  film_rolls_count      integer,
  video                 boolean not null default false,
  short_clips           boolean not null default false,
  second_shooter        boolean not null default false,

  created_at            timestamptz not null default now(),
  unique (package_template_id, version_number)
);

-- Forward FK from package_templates to package_versions
alter table public.package_templates
  add constraint fk_current_version
  foreign key (current_version_id) references public.package_versions (id)
  on delete set null;

-- ─────────────────────────────────────────────────────────────
-- 4. Bookings
-- ─────────────────────────────────────────────────────────────
create type public.booking_status as enum (
  'inquiry',
  'confirmed',
  'shoot_completed',
  'editing',
  'delivered',
  'done',
  'cancelled'
);

create table public.bookings (
  id                      uuid primary key default gen_random_uuid(),
  photographer_id         uuid not null references public.photographers (id) on delete cascade,
  -- Frozen snapshot reference — never changes after booking creation
  package_version_id      uuid not null references public.package_versions (id),
  -- Client
  client_name_primary     text not null,
  client_name_secondary   text,
  client_email            text,
  client_phone            text,
  -- Venue
  venue_name              text,
  venue_address           text,
  -- Schedule
  event_date              date not null,
  start_time              time,
  duration_hours          numeric(4,1),
  -- Notes
  notes                   text,
  -- Status
  status                  public.booking_status not null default 'inquiry',
  -- Per-booking price/hours overrides (additive deltas on top of snapshot)
  price_override          numeric(10,2),   -- null = no override
  hours_override          numeric(4,1),    -- null = no override
  -- Total agreed price — stored at creation, never recomputed
  total_price             numeric(10,2) not null,
  -- Payment
  deposit_amount          numeric(10,2),
  deposit_paid            boolean not null default false,
  deposit_paid_date       date,
  payment_due_date        date,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. Payment log entries
-- ─────────────────────────────────────────────────────────────
create table public.payment_log_entries (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  amount          numeric(10,2) not null,
  paid_date       date not null,
  note            text,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. Deliverable statuses (one row per deliverable per booking)
-- ─────────────────────────────────────────────────────────────
create type public.deliverable_key as enum (
  'edited_photos',
  'wedding_album',
  'film_rolls',
  'video',
  'short_clips',
  'second_shooter'
);

create table public.deliverable_statuses (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings (id) on delete cascade,
  photographer_id   uuid not null references public.photographers (id) on delete cascade,
  deliverable_key   public.deliverable_key not null,
  status            text not null default 'not_started',
  updated_at        timestamptz not null default now(),
  unique (booking_id, deliverable_key)
);

-- ─────────────────────────────────────────────────────────────
-- 7. Task templates (photographer's reusable checklist)
-- ─────────────────────────────────────────────────────────────
create table public.task_templates (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  title           text not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 8. Booking tasks (per-booking copies of templates + custom)
-- ─────────────────────────────────────────────────────────────
create table public.booking_tasks (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  photographer_id uuid not null references public.photographers (id) on delete cascade,
  template_id     uuid references public.task_templates (id) on delete set null,
  title           text not null,
  done            boolean not null default false,
  due_date        date,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 9. Indexes
-- ─────────────────────────────────────────────────────────────
create index on public.bookings (photographer_id, event_date);
create index on public.bookings (photographer_id, status);
create index on public.payment_log_entries (booking_id);
create index on public.deliverable_statuses (booking_id);
create index on public.booking_tasks (booking_id);
create index on public.package_versions (package_template_id, version_number desc);

-- ─────────────────────────────────────────────────────────────
-- 10. Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.photographers         enable row level security;
alter table public.package_templates     enable row level security;
alter table public.package_versions      enable row level security;
alter table public.bookings              enable row level security;
alter table public.payment_log_entries   enable row level security;
alter table public.deliverable_statuses  enable row level security;
alter table public.task_templates        enable row level security;
alter table public.booking_tasks         enable row level security;

-- Photographers: users manage only their own profile
create policy "photographers: own row only"
  on public.photographers for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Package templates
create policy "package_templates: own rows"
  on public.package_templates for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Package versions
create policy "package_versions: own rows"
  on public.package_versions for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Bookings
create policy "bookings: own rows"
  on public.bookings for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Payment log entries
create policy "payment_log_entries: own rows"
  on public.payment_log_entries for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Deliverable statuses
create policy "deliverable_statuses: own rows"
  on public.deliverable_statuses for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Task templates
create policy "task_templates: own rows"
  on public.task_templates for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- Booking tasks
create policy "booking_tasks: own rows"
  on public.booking_tasks for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 11. Atomic booking creation RPC
--     Creates booking + deliverable rows + task rows in one
--     transaction so they cannot partially succeed.
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_booking_atomic(
  p_photographer_id       uuid,
  p_package_version_id    uuid,
  p_client_name_primary   text,
  p_client_name_secondary text,
  p_client_email          text,
  p_client_phone          text,
  p_venue_name            text,
  p_venue_address         text,
  p_event_date            date,
  p_start_time            time,
  p_duration_hours        numeric,
  p_notes                 text,
  p_price_override        numeric,
  p_hours_override        numeric,
  p_total_price           numeric,
  p_deposit_amount        numeric,
  p_payment_due_date      date,
  p_deliverable_keys      public.deliverable_key[],
  p_task_titles           text[],
  p_task_template_ids     uuid[],
  p_task_sort_orders      integer[]
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_booking_id uuid;
  i            integer;
begin
  -- Verify ownership of the package version
  if not exists (
    select 1 from public.package_versions
    where id = p_package_version_id
      and photographer_id = p_photographer_id
  ) then
    raise exception 'Package version not found or access denied';
  end if;

  -- Insert booking
  insert into public.bookings (
    photographer_id, package_version_id,
    client_name_primary, client_name_secondary, client_email, client_phone,
    venue_name, venue_address,
    event_date, start_time, duration_hours,
    notes, price_override, hours_override, total_price,
    deposit_amount, payment_due_date
  ) values (
    p_photographer_id, p_package_version_id,
    p_client_name_primary, p_client_name_secondary, p_client_email, p_client_phone,
    p_venue_name, p_venue_address,
    p_event_date, p_start_time, p_duration_hours,
    p_notes, p_price_override, p_hours_override, p_total_price,
    p_deposit_amount, p_payment_due_date
  ) returning id into v_booking_id;

  -- Insert deliverable status rows (one per enabled deliverable)
  for i in 1..coalesce(array_length(p_deliverable_keys, 1), 0) loop
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (v_booking_id, p_photographer_id, p_deliverable_keys[i], 'not_started');
  end loop;

  -- Insert task rows copied from templates
  for i in 1..coalesce(array_length(p_task_titles, 1), 0) loop
    insert into public.booking_tasks (
      booking_id, photographer_id, template_id, title, sort_order
    ) values (
      v_booking_id, p_photographer_id,
      p_task_template_ids[i],
      p_task_titles[i],
      p_task_sort_orders[i]
    );
  end loop;

  return v_booking_id;
end;
$$;
