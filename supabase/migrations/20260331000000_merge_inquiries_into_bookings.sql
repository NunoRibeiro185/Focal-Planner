-- ─────────────────────────────────────────────────────────────
-- Merge inquiries into bookings
-- • Makes package_version_id and event_date nullable in bookings
--   so inquiry-phase bookings don't need them yet.
-- • Drops the separate inquiries table (no longer needed).
-- • Updates submit_inquiry_public() to insert directly into
--   bookings with status = 'inquiry'.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Relax NOT NULL constraints on bookings ─────────────────

alter table public.bookings
  alter column package_version_id drop not null,
  alter column event_date         drop not null;

-- ── 2. Drop the inquiries table ───────────────────────────────

drop table if exists public.inquiries cascade;

-- ── 3. Update the public form RPC ────────────────────────────
-- Now inserts a booking with status = 'inquiry' instead of an
-- inquiry row. Package interest is resolved to the template's
-- current version (if provided); total_price defaults to 0.

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
  v_photographer_id    uuid;
  v_package_version_id uuid;
  v_booking_id         uuid;
begin
  -- Resolve slug → photographer_id; validate form is enabled
  select id into v_photographer_id
  from public.photographers
  where slug = p_slug
    and inquiry_form_enabled = true;

  if v_photographer_id is null then
    raise exception 'inquiry_form_not_found'
      using hint = 'slug does not exist or form is disabled';
  end if;

  -- Validate package and resolve current version (if provided)
  if p_package_template_id is not null then
    select current_version_id into v_package_version_id
    from public.package_templates
    where id = p_package_template_id
      and photographer_id = v_photographer_id
      and archived = false;

    if v_package_version_id is null then
      raise exception 'invalid_package'
        using hint = 'package does not belong to this photographer or has no current version';
    end if;
  end if;

  insert into public.bookings (
    photographer_id,
    package_version_id,
    client_name_primary,
    client_email,
    client_name_secondary,
    client_phone,
    event_date,
    venue_name,
    venue_address,
    location,
    notes,
    lead_source,
    status,
    total_price,
    deposit_paid
  ) values (
    v_photographer_id,
    v_package_version_id,
    p_client_name_primary,
    p_client_email,
    p_client_name_secondary,
    p_client_phone,
    p_event_date,
    p_venue_name,
    p_venue_address,
    p_location,
    p_notes,
    'inquiry_form',
    'inquiry',
    0,
    false
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;
