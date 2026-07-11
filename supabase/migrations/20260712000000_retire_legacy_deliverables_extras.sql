-- ============================================================
-- Retire legacy deliverables/extras machinery (part 1)
-- ============================================================
-- Product decision 2026-07-11: the services builder (services / booking_services)
-- has replaced the old hardcoded deliverables + extras. Their data was migrated
-- into booking_services back in 20260515000001, and their code paths now have no
-- readers/writers. This drops the dead tables + the broken reassign RPC, and
-- rebuilds create_booking_atomic without the deliverable_statuses path.
--
-- NOT touched here (still load-bearing, retired later with package versioning):
--   package_versions, custom_field_definitions, package_version_custom_fields,
--   bookings.package_version_id / price_override / hours_override.
--
-- Splitter note (see 20260711000000): DROP FUNCTION with array-type signatures
-- is wrapped in a DO block, and the create_booking_atomic CREATE (array params)
-- is the LAST statement so the CLI splitter can't merge it with what follows.
-- The GRANT/REVOKE for the rebuilt function live in the part-2 migration.

-- 1. Drop the broken reassign RPC and the old create_booking_atomic overload.
--    reassign_booking_package has referenced dropped package_versions columns
--    since 20260421000000 (any call throws) — it is unused after Phase 3.
do $drop$
begin
  drop function if exists public.reassign_booking_package(uuid, uuid, uuid, numeric);
  drop function if exists public.create_booking_atomic(uuid, uuid, text, text, text, text, text, text, date, time, numeric, text, numeric, numeric, numeric, numeric, date, public.deliverable_key[], text[], uuid[], integer[], text, numeric);
end
$drop$;

-- 2. Drop the dead tables (data already lives in services / booking_services).
drop table if exists public.booking_deliverable_progress cascade;
drop table if exists public.deliverable_statuses cascade;
drop table if exists public.booking_extras cascade;
drop table if exists public.extras cascade;

-- 3. Drop the now-unreferenced enum (was only used by deliverable_statuses and
--    the old create_booking_atomic parameter, both gone above).
drop type if exists public.deliverable_key;

-- 4. Rebuild create_booking_atomic without the deliverable_statuses path.
--    MUST be the last statement in this file (array-param signature).
create or replace function public.create_booking_atomic(
  p_photographer_id       uuid,
  p_package_version_id    uuid default null,
  p_client_name_primary   text default null,
  p_client_name_secondary text default null,
  p_client_email          text default null,
  p_client_phone          text default null,
  p_venue_name            text default null,
  p_venue_address         text default null,
  p_event_date            date default null,
  p_start_time            time default null,
  p_duration_hours        numeric default null,
  p_notes                 text default null,
  p_price_override        numeric default null,
  p_hours_override        numeric default null,
  p_total_price           numeric default 0,
  p_deposit_amount        numeric default null,
  p_payment_due_date      date default null,
  p_task_titles           text[] default '{}',
  p_task_template_ids     uuid[] default '{}',
  p_task_sort_orders      integer[] default '{}',
  p_status                text default 'confirmed',
  p_discount_amount       numeric default 0
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_booking_id uuid;
  i            integer;
begin
  -- Caller must be the photographer they claim to be. auth.uid() is null for
  -- service-role callers (trusted server code), which are allowed through.
  if auth.uid() is not null and auth.uid() <> p_photographer_id then
    raise exception 'Access denied';
  end if;

  if p_package_version_id is not null then
    if not exists (
      select 1 from public.package_versions
      where id = p_package_version_id
        and photographer_id = p_photographer_id
    ) then
      raise exception 'Package version not found or access denied';
    end if;
  end if;

  insert into public.bookings (
    photographer_id, package_version_id,
    client_name_primary, client_name_secondary, client_email, client_phone,
    venue_name, venue_address,
    event_date, start_time, duration_hours,
    notes, price_override, hours_override, total_price,
    deposit_amount, payment_due_date,
    status, discount_amount
  ) values (
    p_photographer_id, p_package_version_id,
    p_client_name_primary, p_client_name_secondary, p_client_email, p_client_phone,
    p_venue_name, p_venue_address,
    p_event_date, p_start_time, p_duration_hours,
    p_notes, p_price_override, p_hours_override, p_total_price,
    p_deposit_amount, p_payment_due_date,
    p_status::public.booking_status, p_discount_amount
  ) returning id into v_booking_id;

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
