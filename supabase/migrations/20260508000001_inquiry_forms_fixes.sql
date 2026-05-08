-- Fix 1: Remove overly permissive insert policy on inquiry_answers
-- The submit_inquiry_public function is security definer and bypasses RLS.
-- No explicit insert policy needed — removing it blocks direct client inserts.
drop policy if exists "service role insert inquiry answers" on public.inquiry_answers;

-- Fix 2: Updated submit_inquiry_public with null guard on answer_value
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
  v_question_text     text;
  v_answer_value      text;
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

  -- Insert freeform answers, skipping any with missing question or answer text
  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    v_question_text := v_answer->>'question_text';
    v_answer_value  := v_answer->>'answer_value';
    -- Skip answers with missing or empty question/answer
    continue when v_question_text is null or trim(v_question_text) = '';
    continue when v_answer_value is null or trim(v_answer_value) = '';
    insert into public.inquiry_answers (booking_id, question_text, answer_value, sort_order)
    values (
      v_booking_id,
      v_question_text,
      v_answer_value,
      coalesce((v_answer->>'sort_order')::integer, 0)
    );
  end loop;

  return v_booking_id;
end;
$$;

-- Fix 3: Drop photographer_url column and update unique constraint
-- The app constructs the public URL from photographers.slug + inquiry_forms.form_url at render time.
alter table public.inquiry_forms drop constraint inquiry_forms_url_unique;
alter table public.inquiry_forms drop column photographer_url;
alter table public.inquiry_forms add constraint inquiry_forms_url_unique unique (photographer_id, form_url);
