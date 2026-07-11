-- ============================================================
-- Harden SECURITY DEFINER RPCs (part 1: drops + function bodies)
-- ============================================================
-- Problems fixed (2026-07-11 security review):
-- 1. create_booking_atomic / reassign_booking_package accepted an arbitrary
--    p_photographer_id and validated ownership against it, so any authenticated
--    user could write into another tenant account via PostgREST.
-- 2. Both functions (and submit_inquiry_public) were executable by roles that
--    should never call them directly. submit_inquiry_public being callable by
--    anon bypassed the Turnstile CAPTCHA check that lives in the server action.
-- 3. Earlier create-or-replace calls with changed argument lists left stale
--    overloads live in the database (functions are keyed by name + arg types).
--    Those old overloads carried the same flaws, so drop them.
--
-- Convention going forward: every SECURITY DEFINER function that takes a
-- p_photographer_id must start with the auth.uid() guard below. auth.uid() is
-- null for service-role callers (trusted server code, incl. the dev-bypass
-- client), which are allowed through; PostgREST callers must match.
--
-- IMPORTANT layout constraint (Supabase CLI splitter bug): the CLI's migration
-- statement splitter fails to recognize the terminating ';' of a statement
-- whose parenthesized signature ends in a run of array types (e.g. ...,
-- public.deliverable_key[], text[], uuid[], integer[]). It then swallows the
-- following statement(s) and the push fails with "cannot insert multiple
-- commands into a prepared statement". create_booking_atomic has exactly such a
-- signature, so:
--   * DROP/REVOKE/GRANT that reference it are wrapped in DO blocks (the
--     signature text lives inside a dollar-quoted body, invisible to the
--     splitter, and the block is a single command);
--   * the create_booking_atomic CREATE itself cannot be dollar-hidden, so it is
--     the LAST statement in this file (nothing follows it to be swallowed);
--   * the GRANT/REVOKE block, which must run after the function exists, lives in
--     the companion migration 20260711000001_secure_rpc_grants.sql.
-- Verified against the Supabase CLI in a local repro, 2026-07-11.

-- 1. Drop stale overloads -----------------------------------------------------

do $drop$
begin
  -- Original 21-arg create_booking_atomic (pre services-catalog; superseded by the 23-arg version in 20260515000001)
  drop function if exists public.create_booking_atomic(uuid, uuid, text, text, text, text, text, text, date, time, numeric, text, numeric, numeric, numeric, numeric, date, public.deliverable_key[], text[], uuid[], integer[]);
  -- Original slug-based submit_inquiry_public (pre inquiry-forms; superseded by the 13-arg version in 20260508000000)
  drop function if exists public.submit_inquiry_public(text, text, text, text, text, date, text, text, text, uuid, text);
end
$drop$;

-- 2. reassign_booking_package: verify caller identity -------------------------
--    (body otherwise identical to 20260319000004; simple signature, so it is
--    safe to place before the array-signature function below)

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
  -- Caller must be the photographer they claim to be (see create_booking_atomic)
  if auth.uid() is not null and auth.uid() <> p_photographer_id then
    raise exception 'Access denied';
  end if;

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

  update public.bookings set
    package_version_id = p_new_package_version_id,
    total_price        = p_new_total_price,
    price_override     = null,
    hours_override     = null
  where id = p_booking_id;

  delete from public.deliverable_statuses where booking_id = p_booking_id;

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

-- 3. create_booking_atomic: verify caller identity ----------------------------
--    (body otherwise identical to 20260515000001)
--    MUST be the last statement in this file — see the layout note above.

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
  p_deliverable_keys      public.deliverable_key[] default '{}',
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

  for i in 1..coalesce(array_length(p_deliverable_keys, 1), 0) loop
    insert into public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    values (v_booking_id, p_photographer_id, p_deliverable_keys[i], 'not_started');
  end loop;

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
