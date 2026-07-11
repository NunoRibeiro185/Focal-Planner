-- ─────────────────────────────────────────────────────────────────────────
-- Local development seed
-- Runs automatically on `supabase db reset` / first `supabase start`.
-- NEVER runs against the remote project (that uses `supabase db push`).
--
-- Creates the dev-bypass user (email must match the one hardcoded in
-- src/lib/supabase/server.ts) plus a realistic set of demo data so the app
-- is immediately usable when you open it at http://localhost:3000.
--
-- NB: the Supabase seed runner is not psql — no \set / :'var' meta-syntax.
-- The dev photographer id is the literal 11111111-1111-1111-1111-111111111111.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- 1. Auth user. The on_auth_user_created trigger creates the matching
--    public.photographers row from this insert.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'nunomonizribeiro@gmail.com',
  extensions.crypt('local-dev-password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nuno Ribeiro"}',
  now(), now()
)
on conflict (id) do nothing;

-- 2. Flesh out the photographer profile created by the trigger.
update public.photographers
set full_name             = 'Nuno Ribeiro',
    default_currency      = 'EUR',
    slug                  = 'nuno-ribeiro',
    inquiry_form_enabled  = true
where id = '11111111-1111-1111-1111-111111111111';

-- 3. Services catalog.
insert into public.services (id, photographer_id, name, unit_price, track_completion) values
  ('a1a1a1a1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Engagement shoot',      350, false),
  ('a1a1a1a1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Premium leather album', 480, true),
  ('a1a1a1a1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Second shooter',        300, false);

-- 4. Package templates + their immutable current versions.
insert into public.package_templates (id, photographer_id, name, archived) values
  ('b2b2b2b2-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Full Day Wedding', false),
  ('b2b2b2b2-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Portrait Session', false);

insert into public.package_versions
  (id, package_template_id, photographer_id, version_number, version_name, base_price, currency, hours_of_coverage, description) values
  ('c3c3c3c3-0000-0000-0000-000000000001', 'b2b2b2b2-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, 'Version 1', 3200, 'EUR', 10, 'Full-day coverage, two photographers, online gallery.'),
  ('c3c3c3c3-0000-0000-0000-000000000002', 'b2b2b2b2-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, 'Version 1', 450,  'EUR', 2,  'Two-hour portrait session, 40 edited images.');

update public.package_templates
set current_version_id = 'c3c3c3c3-0000-0000-0000-000000000001'
where id = 'b2b2b2b2-0000-0000-0000-000000000001';
update public.package_templates
set current_version_id = 'c3c3c3c3-0000-0000-0000-000000000002'
where id = 'b2b2b2b2-0000-0000-0000-000000000002';

-- Attach catalog services to the wedding package.
insert into public.package_template_services (package_template_id, service_id, photographer_id, default_quantity, sort_order) values
  ('b2b2b2b2-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, 0),
  ('b2b2b2b2-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1, 1);

-- 5. Bookings spanning the lifecycle.
insert into public.bookings
  (id, photographer_id, package_version_id, client_name_primary, client_name_secondary, client_email, venue_name, event_date, status, total_price, deposit_amount, deposit_paid, lead_source) values
  ('d4d4d4d4-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3c3c3c3-0000-0000-0000-000000000001', 'Ana & Tiago',  'Tiago Sousa',  'ana@example.com',   'Quinta das Lágrimas', current_date + 60, 'confirmed',       3500, 1000, true,  'instagram'),
  ('d4d4d4d4-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3c3c3c3-0000-0000-0000-000000000001', 'Marta & João', 'João Pereira', 'marta@example.com', 'Palácio de Seteais', current_date - 14, 'editing',         3200, 1000, true,  'referral'),
  ('d4d4d4d4-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c3c3c3c3-0000-0000-0000-000000000002', 'Beatriz Lima', null,           'bea@example.com',   'Studio',             current_date - 90, 'done',            450,  150,  true,  'google'),
  ('d4d4d4d4-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c3c3c3c3-0000-0000-0000-000000000001', 'Sofia & Pedro',null,           'sofia@example.com', null,                 current_date + 120,'inquiry',         3200, null, false, 'inquiry_form');

-- 6. A couple of expenses tied to a booking.
insert into public.expenses
  (photographer_id, booking_id, category, description, amount, currency, expense_date, paid_by) values
  ('11111111-1111-1111-1111-111111111111', 'd4d4d4d4-0000-0000-0000-000000000002', 'travel',          'Fuel + tolls to venue', 85,  'EUR', current_date - 14, 'photographer'),
  ('11111111-1111-1111-1111-111111111111', 'd4d4d4d4-0000-0000-0000-000000000002', 'second_shooter',  'Second shooter fee',    300, 'EUR', current_date - 14, 'photographer');

-- 7. Workflow templates.
insert into public.task_templates (photographer_id, title, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Send welcome guide',     0),
  ('11111111-1111-1111-1111-111111111111', 'Confirm timeline',       1),
  ('11111111-1111-1111-1111-111111111111', 'Deliver sneak peeks',    2);

insert into public.editing_stage_templates (photographer_id, title, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Cull',     0),
  ('11111111-1111-1111-1111-111111111111', 'Color',    1),
  ('11111111-1111-1111-1111-111111111111', 'Retouch',  2),
  ('11111111-1111-1111-1111-111111111111', 'Export',   3);

commit;
