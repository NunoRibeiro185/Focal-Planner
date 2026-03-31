-- ─────────────────────────────────────────────────────────────
-- Step 2 of 2: Inquiry form feature
-- 1. Add slug + inquiry form settings to photographers
-- 2. Create inquiries table with RLS
-- 3. Add security-definer RPC for public form submission
-- ─────────────────────────────────────────────────────────────

-- ── 1. Photographer: slug + form settings ────────────────────

alter table public.photographers
  add column slug                        text unique,
  add column inquiry_form_enabled        boolean not null default false,
  add column inquiry_show_packages       boolean not null default true,
  add column inquiry_show_prices         boolean not null default true,
  add column inquiry_show_phone          boolean not null default true,
  add column inquiry_show_secondary_name boolean not null default true,
  add column inquiry_show_event_date     boolean not null default true,
  add column inquiry_show_venue          boolean not null default true,
  add column inquiry_show_location       boolean not null default true,
  add column inquiry_show_notes          boolean not null default true;

create unique index photographers_slug_idx on public.photographers (slug)
  where slug is not null;

-- ── 2. Inquiries table ───────────────────────────────────────

create table public.inquiries (
  id                    uuid primary key default gen_random_uuid(),
  photographer_id       uuid not null references public.photographers (id) on delete cascade,

  -- Client info (name + email mandatory; rest optional)
  client_name_primary   text not null,
  client_name_secondary text,
  client_email          text not null,
  client_phone          text,

  -- Event details (all optional — clients often don't know yet)
  event_date            date,
  venue_name            text,
  venue_address         text,
  location              text,

  -- Package interest (optional FK to template; no version lock at inquiry stage)
  package_template_id   uuid references public.package_templates (id) on delete set null,

  -- Meta
  notes                 text,
  lead_source           public.lead_source not null default 'inquiry_form',
  status                text not null default 'new'
                          check (status in ('new', 'converted', 'archived')),
  converted_booking_id  uuid references public.bookings (id) on delete set null,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index inquiries_photographer_created_idx
  on public.inquiries (photographer_id, created_at desc);

create index inquiries_photographer_status_idx
  on public.inquiries (photographer_id, status);

-- ── Updated-at trigger ───────────────────────────────────────

create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

alter table public.inquiries enable row level security;

create policy "inquiries: own rows"
  on public.inquiries for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ── Public insert RPC ────────────────────────────────────────
-- Called from the submitInquiry server action via the service-role
-- client. Validates slug existence + form enabled + package ownership
-- before inserting, keeping security checks in the DB layer.

create or replace function public.submit_inquiry_public(
  p_slug                  text,
  p_client_name_primary   text,
  p_client_email          text,
  p_client_name_secondary text default null,
  p_client_phone          text default null,
  p_event_date            date default null,
  p_venue_name            text default null,
  p_venue_address         text default null,
  p_location              text default null,
  p_package_template_id   uuid default null,
  p_notes                 text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photographer_id uuid;
  v_inquiry_id      uuid;
begin
  -- Resolve slug → photographer_id; also validate form is enabled
  select id into v_photographer_id
  from public.photographers
  where slug = p_slug
    and inquiry_form_enabled = true;

  if v_photographer_id is null then
    raise exception 'inquiry_form_not_found'
      using hint = 'slug does not exist or form is disabled';
  end if;

  -- Validate package belongs to this photographer (if provided)
  if p_package_template_id is not null then
    if not exists (
      select 1 from public.package_templates
      where id = p_package_template_id
        and photographer_id = v_photographer_id
        and archived = false
    ) then
      raise exception 'invalid_package'
        using hint = 'package does not belong to this photographer';
    end if;
  end if;

  insert into public.inquiries (
    photographer_id,
    client_name_primary,
    client_email,
    client_name_secondary,
    client_phone,
    event_date,
    venue_name,
    venue_address,
    location,
    package_template_id,
    notes,
    lead_source
  ) values (
    v_photographer_id,
    p_client_name_primary,
    p_client_email,
    p_client_name_secondary,
    p_client_phone,
    p_event_date,
    p_venue_name,
    p_venue_address,
    p_location,
    p_package_template_id,
    p_notes,
    'inquiry_form'
  )
  returning id into v_inquiry_id;

  return v_inquiry_id;
end;
$$;
