-- ── New enums ──────────────────────────────────────────────────────────────
create type inquiry_field_type as enum (
  'short_text', 'long_text', 'single_choice', 'multiple_choice', 'number', 'date'
);

create type inquiry_field_mapping as enum (
  'client_name_secondary', 'client_phone', 'event_date',
  'venue_name', 'venue_address', 'location', 'notes', 'package_template_id'
);

-- ── inquiry_forms ──────────────────────────────────────────────────────────
create table public.inquiry_forms (
  id                uuid primary key default gen_random_uuid(),
  photographer_id   uuid not null references public.photographers(id) on delete cascade,
  name              text not null,
  photographer_url  text not null,
  form_url          text not null,
  is_active         boolean not null default true,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint inquiry_forms_url_unique unique (photographer_id, photographer_url, form_url)
);

alter table public.inquiry_forms enable row level security;

create policy "photographers manage own forms"
  on public.inquiry_forms for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ── inquiry_form_fields ────────────────────────────────────────────────────
create table public.inquiry_form_fields (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.inquiry_forms(id) on delete cascade,
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  field_type    inquiry_field_type not null,
  label         text not null,
  helper_text   text,
  is_required   boolean not null default false,
  sort_order    integer not null default 0,
  field_mapping inquiry_field_mapping,
  created_at    timestamptz not null default now()
);

alter table public.inquiry_form_fields enable row level security;

create policy "photographers manage own fields"
  on public.inquiry_form_fields for all
  using (photographer_id = auth.uid())
  with check (photographer_id = auth.uid());

-- ── inquiry_form_field_options ─────────────────────────────────────────────
create table public.inquiry_form_field_options (
  id          uuid primary key default gen_random_uuid(),
  field_id    uuid not null references public.inquiry_form_fields(id) on delete cascade,
  label       text not null,
  sort_order  integer not null default 0
);

alter table public.inquiry_form_field_options enable row level security;

create policy "photographers manage own options"
  on public.inquiry_form_field_options for all
  using (
    field_id in (
      select id from public.inquiry_form_fields where photographer_id = auth.uid()
    )
  )
  with check (
    field_id in (
      select id from public.inquiry_form_fields where photographer_id = auth.uid()
    )
  );

-- ── inquiry_form_allowed_packages ──────────────────────────────────────────
create table public.inquiry_form_allowed_packages (
  form_id             uuid not null references public.inquiry_forms(id) on delete cascade,
  package_template_id uuid not null references public.package_templates(id) on delete cascade,
  primary key (form_id, package_template_id)
);

alter table public.inquiry_form_allowed_packages enable row level security;

create policy "photographers manage own allowed packages"
  on public.inquiry_form_allowed_packages for all
  using (
    form_id in (
      select id from public.inquiry_forms where photographer_id = auth.uid()
    )
  )
  with check (
    form_id in (
      select id from public.inquiry_forms where photographer_id = auth.uid()
    )
  );

-- ── inquiry_answers ────────────────────────────────────────────────────────
create table public.inquiry_answers (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  question_text text not null,
  answer_value  text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.inquiry_answers enable row level security;

create policy "photographers read own inquiry answers"
  on public.inquiry_answers for select
  using (
    booking_id in (
      select id from public.bookings where photographer_id = auth.uid()
    )
  );

create policy "service role insert inquiry answers"
  on public.inquiry_answers for insert
  with check (true);

-- ── Booking columns ────────────────────────────────────────────────────────
alter table public.bookings
  add column inquiry_form_id            uuid references public.inquiry_forms(id) on delete set null,
  add column inquiry_form_name_snapshot text;

-- ── Updated submit_inquiry_public ──────────────────────────────────────────
create or replace function public.submit_inquiry_public(
  p_photographer_url    text,
  p_form_url            text,
  p_client_name_primary text,
  p_client_email        text,
  p_client_name_secondary text default null,
  p_client_phone          text default null,
  p_event_date            date default null,
  p_venue_name            text default null,
  p_venue_address         text default null,
  p_location              text default null,
  p_package_template_id   uuid default null,
  p_notes                 text default null,
  p_answers               jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  v_photographer_id   uuid;
  v_form_id           uuid;
  v_form_name         text;
  v_pkg_version_id    uuid;
  v_booking_id        uuid;
  v_answer            jsonb;
begin
  select id into v_photographer_id
  from public.photographers
  where slug = p_photographer_url
  limit 1;

  if v_photographer_id is null then
    raise exception 'inquiry_form_not_found';
  end if;

  select id, name into v_form_id, v_form_name
  from public.inquiry_forms
  where photographer_id = v_photographer_id
    and form_url = p_form_url
    and is_active = true
    and archived_at is null
  limit 1;

  if v_form_id is null then
    raise exception 'inquiry_form_not_found';
  end if;

  if p_package_template_id is not null then
    select current_version_id into v_pkg_version_id
    from public.package_templates
    where id = p_package_template_id
      and photographer_id = v_photographer_id
      and archived = false;

    if v_pkg_version_id is null then
      raise exception 'invalid_package';
    end if;
  end if;

  insert into public.bookings (
    photographer_id, status, lead_source,
    client_name_primary, client_email,
    client_name_secondary, client_phone,
    event_date, venue_name, venue_address, location,
    package_version_id, notes,
    total_price, deposit_paid,
    inquiry_form_id, inquiry_form_name_snapshot
  ) values (
    v_photographer_id, 'inquiry', 'inquiry_form',
    p_client_name_primary, p_client_email,
    p_client_name_secondary, p_client_phone,
    p_event_date, p_venue_name, p_venue_address, p_location,
    v_pkg_version_id, p_notes,
    0, false,
    v_form_id, v_form_name
  )
  returning id into v_booking_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.inquiry_answers (booking_id, question_text, answer_value, sort_order)
    values (
      v_booking_id,
      v_answer->>'question_text',
      v_answer->>'answer_value',
      coalesce((v_answer->>'sort_order')::integer, 0)
    );
  end loop;

  return v_booking_id;
end;
$$;
