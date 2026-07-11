-- ============================================================
-- Retire legacy deliverables/extras machinery (part 2: grants)
-- ============================================================
-- Companion to 20260712000000. The rebuilt create_booking_atomic is a NEW
-- function signature (p_deliverable_keys removed), so it defaults to EXECUTE for
-- PUBLIC — including anon, which the auth.uid() guard does NOT stop (a null uid
-- passes the guard). Re-apply the Phase 0 privilege model: authenticated +
-- service_role only.
--
-- Wrapped in a DO block because the revoke/grant reference the array-param
-- signature, which the CLI splitter mishandles outside a dollar-quoted body.

do $grants$
begin
  revoke execute on function public.create_booking_atomic(uuid, uuid, text, text, text, text, text, text, date, time, numeric, text, numeric, numeric, numeric, numeric, date, text[], uuid[], integer[], text, numeric) from anon, public;
  grant execute on function public.create_booking_atomic(uuid, uuid, text, text, text, text, text, text, date, time, numeric, text, numeric, numeric, numeric, numeric, date, text[], uuid[], integer[], text, numeric) to authenticated, service_role;
end
$grants$;
