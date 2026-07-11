-- ============================================================
-- Harden SECURITY DEFINER RPCs (part 2: execution privileges)
-- ============================================================
-- Companion to 20260711000000_secure_rpcs.sql. Kept in a separate migration
-- because these GRANT/REVOKE statements must run AFTER create_booking_atomic
-- exists, and that function has to be the last statement in part 1 to dodge the
-- Supabase CLI splitter bug (see the layout note in part 1).
--
-- The whole block is wrapped in a single DO block for that same reason: the
-- create_booking_atomic revoke/grant end in a run of array types
-- (public.deliverable_key[], text[], uuid[], integer[], ...) which the CLI
-- splitter cannot terminate; inside a dollar-quoted body that text is invisible
-- to the splitter and the block is a single command.
--
-- Booking RPCs: authenticated only (the auth.uid() guard in part 1 pins each
-- caller to their own tenant); anon must never call these. submit_inquiry_public
-- is only reachable through the submitInquiry server action (service-role
-- client), which enforces Turnstile; direct anon/authenticated PostgREST calls
-- would bypass the CAPTCHA. Explicit grants so intended access does not depend
-- on default privileges.

do $grants$
begin
  revoke execute on function public.create_booking_atomic(uuid, uuid, text, text, text, text, text, text, date, time, numeric, text, numeric, numeric, numeric, numeric, date, public.deliverable_key[], text[], uuid[], integer[], text, numeric) from anon, public;
  revoke execute on function public.reassign_booking_package(uuid, uuid, uuid, numeric) from anon, public;
  revoke execute on function public.submit_inquiry_public(text, text, text, text, text, text, date, text, text, text, uuid, text, jsonb) from anon, authenticated, public;

  grant execute on function public.create_booking_atomic(uuid, uuid, text, text, text, text, text, text, date, time, numeric, text, numeric, numeric, numeric, numeric, date, public.deliverable_key[], text[], uuid[], integer[], text, numeric) to authenticated, service_role;
  grant execute on function public.reassign_booking_package(uuid, uuid, uuid, numeric) to authenticated, service_role;
  grant execute on function public.submit_inquiry_public(text, text, text, text, text, text, date, text, text, text, uuid, text, jsonb) to service_role;
end
$grants$;
