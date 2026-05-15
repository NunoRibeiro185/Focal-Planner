-- Migration: Services Catalog & Per-Booking Package Builder

-- ─── 1. Services catalog ──────────────────────────────────────

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  track_completion BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographers_manage_own_services" ON services
  FOR ALL USING (photographer_id = auth.uid());

-- Migrate extras → services (preserve IDs so booking_extras FK still resolves)
INSERT INTO services (id, photographer_id, name, description, unit_price, track_completion, deleted_at, created_at)
SELECT id, photographer_id, name, description, price, FALSE, deleted_at, created_at
FROM extras;

-- Migrate custom_field_definitions → services (new IDs, unit_price = 0)
INSERT INTO services (photographer_id, name, description, unit_price, track_completion, deleted_at, created_at)
SELECT photographer_id, label, description, 0,
  CASE WHEN field_type = 'checkbox' THEN TRUE ELSE FALSE END,
  deleted_at, created_at
FROM custom_field_definitions;

-- ─── 2. Per-booking line items ────────────────────────────────

CREATE TABLE booking_services (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photographer_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id                UUID REFERENCES services(id) ON DELETE SET NULL,
  name_snapshot             VARCHAR(255) NOT NULL,
  description_snapshot      TEXT,
  unit_price_snapshot       NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity                  INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  track_completion_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
  done                      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order                INTEGER NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographers_manage_own_booking_services" ON booking_services
  FOR ALL USING (photographer_id = auth.uid());

-- Migrate booking_extras → booking_services
INSERT INTO booking_services (
  booking_id, photographer_id, service_id,
  name_snapshot, unit_price_snapshot, quantity,
  track_completion_snapshot, done, sort_order
)
SELECT
  booking_id, photographer_id, extra_id,
  name_snapshot, price_snapshot, quantity,
  FALSE, FALSE, 0
FROM booking_extras;

-- Migrate booking_deliverable_progress → booking_services
INSERT INTO booking_services (
  booking_id, photographer_id, service_id,
  name_snapshot, description_snapshot, unit_price_snapshot,
  quantity, track_completion_snapshot, done, sort_order
)
SELECT
  booking_id, photographer_id, NULL,
  label, description, 0,
  1, TRUE, done, 0
FROM booking_deliverable_progress;

-- ─── 3. Package template services ────────────────────────────

CREATE TABLE package_template_services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_template_id UUID NOT NULL REFERENCES package_templates(id) ON DELETE CASCADE,
  service_id          UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  photographer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_quantity    INTEGER NOT NULL DEFAULT 1 CHECK (default_quantity >= 1),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE package_template_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographers_manage_own_package_template_services" ON package_template_services
  FOR ALL USING (photographer_id = auth.uid());

-- ─── 4. Add discount_amount to bookings ───────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);

-- ─── 5. Update create_booking_atomic RPC ─────────────────────

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_photographer_id       uuid,
  p_package_version_id    uuid DEFAULT NULL,
  p_client_name_primary   text DEFAULT NULL,
  p_client_name_secondary text DEFAULT NULL,
  p_client_email          text DEFAULT NULL,
  p_client_phone          text DEFAULT NULL,
  p_venue_name            text DEFAULT NULL,
  p_venue_address         text DEFAULT NULL,
  p_event_date            date DEFAULT NULL,
  p_start_time            time DEFAULT NULL,
  p_duration_hours        numeric DEFAULT NULL,
  p_notes                 text DEFAULT NULL,
  p_price_override        numeric DEFAULT NULL,
  p_hours_override        numeric DEFAULT NULL,
  p_total_price           numeric DEFAULT 0,
  p_deposit_amount        numeric DEFAULT NULL,
  p_payment_due_date      date DEFAULT NULL,
  p_deliverable_keys      public.deliverable_key[] DEFAULT '{}',
  p_task_titles           text[] DEFAULT '{}',
  p_task_template_ids     uuid[] DEFAULT '{}',
  p_task_sort_orders      integer[] DEFAULT '{}',
  p_status                text DEFAULT 'confirmed',
  p_discount_amount       numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  i            integer;
BEGIN
  IF p_package_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.package_versions
      WHERE id = p_package_version_id
        AND photographer_id = p_photographer_id
    ) THEN
      RAISE EXCEPTION 'Package version not found or access denied';
    END IF;
  END IF;

  INSERT INTO public.bookings (
    photographer_id, package_version_id,
    client_name_primary, client_name_secondary, client_email, client_phone,
    venue_name, venue_address,
    event_date, start_time, duration_hours,
    notes, price_override, hours_override, total_price,
    deposit_amount, payment_due_date,
    status, discount_amount
  ) VALUES (
    p_photographer_id, p_package_version_id,
    p_client_name_primary, p_client_name_secondary, p_client_email, p_client_phone,
    p_venue_name, p_venue_address,
    p_event_date, p_start_time, p_duration_hours,
    p_notes, p_price_override, p_hours_override, p_total_price,
    p_deposit_amount, p_payment_due_date,
    p_status::public.booking_status, p_discount_amount
  ) RETURNING id INTO v_booking_id;

  FOR i IN 1..COALESCE(array_length(p_deliverable_keys, 1), 0) LOOP
    INSERT INTO public.deliverable_statuses (booking_id, photographer_id, deliverable_key, status)
    VALUES (v_booking_id, p_photographer_id, p_deliverable_keys[i], 'not_started');
  END LOOP;

  FOR i IN 1..COALESCE(array_length(p_task_titles, 1), 0) LOOP
    INSERT INTO public.booking_tasks (
      booking_id, photographer_id, template_id, title, sort_order
    ) VALUES (
      v_booking_id, p_photographer_id,
      p_task_template_ids[i],
      p_task_titles[i],
      p_task_sort_orders[i]
    );
  END LOOP;

  RETURN v_booking_id;
END;
$$;
