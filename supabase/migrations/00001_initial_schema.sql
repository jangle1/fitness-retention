-- ==========================================
-- FitBook MVP - Initial Schema
-- Event-ledger design for AI churn prediction
-- ==========================================

-- ==========================================
-- TRAINERS (the primary users)
-- ==========================================
CREATE TABLE trainers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_auth_id     UUID NOT NULL UNIQUE,
    email                TEXT NOT NULL UNIQUE,
    full_name            TEXT NOT NULL,
    slug                 TEXT NOT NULL UNIQUE,
    timezone             TEXT NOT NULL DEFAULT 'UTC',
    buffer_minutes       INT NOT NULL DEFAULT 30,
    google_calendar_id   TEXT,
    google_refresh_token TEXT,
    google_sync_token    TEXT,
    avatar_url           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- CLIENTS (the trainer's customers)
-- ==========================================
CREATE TABLE clients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT NOT NULL,
    phone       TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trainer_id, email)
);

-- ==========================================
-- PACKAGES (session bundles)
-- ==========================================
CREATE TABLE packages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id     UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    total_sessions INT NOT NULL,
    used_sessions  INT NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- AVAILABILITY RULES (recurring weekly slots)
-- ==========================================
CREATE TABLE availability_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    is_active   BOOL NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- BOOKINGS (current state - mutable)
-- ==========================================
CREATE TABLE bookings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id       UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id       UUID REFERENCES packages(id),
    status           TEXT NOT NULL DEFAULT 'booked'
                     CHECK (status IN ('booked', 'rescheduled', 'cancelled', 'attended', 'no_show')),
    starts_at        TIMESTAMPTZ NOT NULL,
    ends_at          TIMESTAMPTZ NOT NULL,
    google_event_id  TEXT,
    session_notes    TEXT,
    reminder_sent    BOOL NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- BOOKING EVENTS (immutable event ledger)
-- This is the AI training data goldmine
-- ==========================================
CREATE TABLE booking_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    trainer_id    UUID NOT NULL REFERENCES trainers(id),
    client_id     UUID NOT NULL REFERENCES clients(id),
    event_type    TEXT NOT NULL
                  CHECK (event_type IN (
                      'created',
                      'rescheduled',
                      'cancelled',
                      'attended',
                      'no_show',
                      'notes_added',
                      'reminder_sent'
                  )),
    old_starts_at TIMESTAMPTZ,
    new_starts_at TIMESTAMPTZ,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_bookings_trainer_time ON bookings(trainer_id, starts_at);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_booking_events_client ON booking_events(client_id, created_at);
CREATE INDEX idx_booking_events_trainer ON booking_events(trainer_id, created_at);
CREATE INDEX idx_booking_events_type ON booking_events(event_type, created_at);
CREATE INDEX idx_availability_trainer ON availability_rules(trainer_id, day_of_week);
CREATE INDEX idx_trainers_slug ON trainers(slug);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- Trainers can only access their own row
CREATE POLICY "trainers_own_row" ON trainers
    FOR ALL USING (supabase_auth_id = auth.uid());

-- Trainers can only access their own clients
CREATE POLICY "clients_own_trainer" ON clients
    FOR ALL USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- Trainers can only access their own packages
CREATE POLICY "packages_own_trainer" ON packages
    FOR ALL USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- Trainers can only access their own availability rules
CREATE POLICY "availability_own_trainer" ON availability_rules
    FOR ALL USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- Trainers can only access their own bookings
CREATE POLICY "bookings_own_trainer" ON bookings
    FOR ALL USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- Trainers can only access their own booking events
CREATE POLICY "booking_events_own_trainer" ON booking_events
    FOR ALL USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- Public read access for trainer profiles (for booking pages)
CREATE POLICY "trainers_public_read" ON trainers
    FOR SELECT USING (true);

-- Public read access for availability (for booking pages)
CREATE POLICY "availability_public_read" ON availability_rules
    FOR SELECT USING (true);

-- Public read access for bookings (to check availability on booking pages)
-- Only exposes time slots, not client details (controlled at query level)
CREATE POLICY "bookings_public_read" ON bookings
    FOR SELECT USING (true);

-- ==========================================
-- UPDATED_AT TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trainers_updated_at
    BEFORE UPDATE ON trainers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
