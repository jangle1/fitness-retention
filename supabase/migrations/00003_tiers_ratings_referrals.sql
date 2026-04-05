-- ==========================================
-- Tier system, ratings, branding, referrals
-- ==========================================

-- Add tier and profile fields to trainers
ALTER TABLE trainers
    ADD COLUMN tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
    ADD COLUMN bio TEXT,
    ADD COLUMN city TEXT,
    ADD COLUMN specialties TEXT[], -- e.g. {'strength', 'yoga', 'rehab'}
    ADD COLUMN brand_primary_color TEXT DEFAULT '#0f172a',
    ADD COLUMN brand_hide_logo BOOL NOT NULL DEFAULT false,
    ADD COLUMN referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    ADD COLUMN referred_by UUID REFERENCES trainers(id);

-- ==========================================
-- RATINGS (post-session one-tap client ratings)
-- ==========================================
CREATE TABLE ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    score       INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment     TEXT,
    token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ratings_trainer ON ratings(trainer_id, created_at);

-- ==========================================
-- REFERRAL CREDITS
-- ==========================================
CREATE TABLE referral_credits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id     UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    referred_id     UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    booking_id      UUID REFERENCES bookings(id),  -- the warm lead booking
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- RE-ENGAGEMENT NUDGES LOG
-- ==========================================
CREATE TABLE nudges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id  UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('inactive_client', 'package_expiring')),
    dismissed   BOOL NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nudges_trainer ON nudges(trainer_id, dismissed, created_at);

-- ==========================================
-- RLS for new tables
-- ==========================================
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

-- Ratings: public read (for review badges), trainer can manage own
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (true); -- clients rate via token
CREATE POLICY "ratings_update" ON ratings FOR UPDATE USING (
    trainer_id IN (SELECT id FROM trainers WHERE supabase_auth_id = auth.uid())
);

-- Referral credits: trainers see their own
CREATE POLICY "referral_credits_select" ON referral_credits FOR SELECT USING (
    referrer_id IN (SELECT id FROM trainers WHERE supabase_auth_id = auth.uid())
    OR referred_id IN (SELECT id FROM trainers WHERE supabase_auth_id = auth.uid())
);
CREATE POLICY "referral_credits_insert" ON referral_credits FOR INSERT WITH CHECK (true);

-- Nudges: trainer's own
CREATE POLICY "nudges_select" ON nudges FOR SELECT USING (
    trainer_id IN (SELECT id FROM trainers WHERE supabase_auth_id = auth.uid())
);
CREATE POLICY "nudges_insert" ON nudges FOR INSERT WITH CHECK (
    trainer_id IN (SELECT id FROM trainers WHERE supabase_auth_id = auth.uid())
);
CREATE POLICY "nudges_update" ON nudges FOR UPDATE USING (
    trainer_id IN (SELECT id FROM trainers WHERE supabase_auth_id = auth.uid())
);
