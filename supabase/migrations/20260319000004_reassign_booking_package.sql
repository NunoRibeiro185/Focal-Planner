-- Atomically reassigns a booking to a different package version.
-- Deletes all existing deliverable_statuses and creates new ones based on
-- the new version's deliverables. Resets price/hours overrides to null.
-- booking_extras are preserved — they are independent of the package.
create or replace function public.reassign_booking_package(
  p_booking_id             uuid,
  p_photographer_id        uuid,
  p_new_package_version_id uuid,
  p_new_total_price        numeric
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_version public.package_versions%rowtype;
begin
  -- Verify booking ownership
  if not exists (
    select 1 from public.bookings
    where id = p_booking_id and photographer_id = p_photographer_id
  ) then
    raise exception 'Booking not found or access denied';
  end if;

  -- Verify package version ownership
  if not exists (
    select 1 from public.package_versions
    where id = p_new_package_version_id and photographer_id = p_photographer_id
  ) then
    raise exception 'Package version not found or access denied';
  end if;

  select * into v_version
  from public.package_versions
  where id = p_new_package_version_id;

  -- 1. Update the booking: new package reference, new total, reset overrides
  update public.bookings set
    package_version_id = p_new_package_version_id,
    total_price        = p_new_total_price,
    price_override     = null,
    hours_override     = null
  where id = p_booking_id;

  -- 2. Delete all old deliverable tracking rows
  delete from public.deliverable_statuses where booking_id = p_booking_id;

  -- 3. Insert new deliverable rows based on the new version's fields
  if coalesce(v_version.edited_photos_count, 0) > 0 then
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (p_booking_id, p_photographer_id, 'edited_photos', 'not_started');
  end if;

  if v_version.wedding_album then
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (p_booking_id, p_photographer_id, 'wedding_album', 'not_started');
  end if;

  if coalesce(v_version.film_rolls_count, 0) > 0 then
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (p_booking_id, p_photographer_id, 'film_rolls', 'not_started');
  end if;

  if v_version.video then
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (p_booking_id, p_photographer_id, 'video', 'not_started');
  end if;

  if v_version.short_clips then
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (p_booking_id, p_photographer_id, 'short_clips', 'not_started');
  end if;

  if v_version.second_shooter then
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (p_booking_id, p_photographer_id, 'second_shooter', 'not_started');
  end if;
end;
$$;
