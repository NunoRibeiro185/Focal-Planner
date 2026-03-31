-- ─────────────────────────────────────────────────────────────
-- Update submit_inquiry_public to also create a first itinerary
-- stop when venue_name is provided, so the booking detail page
-- can show/edit the venue inline without needing the edit form.
-- ─────────────────────────────────────────────────────────────

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

  -- Create a first itinerary stop from venue info when provided
  if p_venue_name is not null and p_venue_name <> '' then
    insert into public.booking_itinerary_stops (
      booking_id,
      photographer_id,
      name,
      address,
      sort_order
    ) values (
      v_booking_id,
      v_photographer_id,
      p_venue_name,
      nullif(p_venue_address, ''),
      10
    );
  end if;

  return v_booking_id;
end;
$$;
