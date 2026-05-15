-- supabase/migrations/20260516000000_deal_room.sql

-- 1. Add client_token to bookings (auto-populates for all existing rows)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_token UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Track who added each itinerary stop
ALTER TABLE booking_itinerary_stops
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'photographer'
  CHECK (created_by IN ('photographer', 'client'));

-- 3. Proposals sent by the photographer
CREATE TABLE deal_room_proposals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photographer_id     UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  package_name        TEXT NOT NULL,
  line_items          JSONB NOT NULL DEFAULT '[]',
  total_price         NUMERIC(10,2) NOT NULL,
  allow_renegotiation BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent', 'accepted', 'countered')),
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at        TIMESTAMPTZ
);

ALTER TABLE deal_room_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage own proposals"
  ON deal_room_proposals FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- 4. Counter-offers submitted by the client
CREATE TABLE deal_room_counter_offers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id        UUID NOT NULL REFERENCES deal_room_proposals(id) ON DELETE CASCADE,
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  removed_item_names JSONB NOT NULL DEFAULT '[]',
  proposed_total     NUMERIC(10,2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deal_room_counter_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers view counter offers on own bookings"
  ON deal_room_counter_offers FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE photographer_id = auth.uid()
    )
  );

-- 5. Post-booking questions added by the photographer
CREATE TABLE deal_room_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE deal_room_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage own questions"
  ON deal_room_questions FOR ALL
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- 6. Client answers to post-booking questions
CREATE TABLE deal_room_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES deal_room_questions(id) ON DELETE CASCADE,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT deal_room_answers_question_id_key UNIQUE (question_id)
);

ALTER TABLE deal_room_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers view answers on own bookings"
  ON deal_room_answers FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE photographer_id = auth.uid()
    )
  );
