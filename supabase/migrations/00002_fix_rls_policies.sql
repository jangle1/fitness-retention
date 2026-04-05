-- Fix RLS policies: split FOR ALL into separate INSERT/SELECT/UPDATE/DELETE
-- The FOR ALL policy doesn't work properly for INSERT since the row doesn't exist yet

-- TRAINERS
DROP POLICY IF EXISTS "trainers_own_row" ON trainers;
DROP POLICY IF EXISTS "trainers_public_read" ON trainers;

CREATE POLICY "trainers_select" ON trainers
    FOR SELECT USING (true);

CREATE POLICY "trainers_insert" ON trainers
    FOR INSERT WITH CHECK (supabase_auth_id = auth.uid());

CREATE POLICY "trainers_update" ON trainers
    FOR UPDATE USING (supabase_auth_id = auth.uid());

CREATE POLICY "trainers_delete" ON trainers
    FOR DELETE USING (supabase_auth_id = auth.uid());

-- CLIENTS
DROP POLICY IF EXISTS "clients_own_trainer" ON clients;

CREATE POLICY "clients_select" ON clients
    FOR SELECT USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "clients_insert" ON clients
    FOR INSERT WITH CHECK (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "clients_update" ON clients
    FOR UPDATE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "clients_delete" ON clients
    FOR DELETE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- PACKAGES
DROP POLICY IF EXISTS "packages_own_trainer" ON packages;

CREATE POLICY "packages_select" ON packages
    FOR SELECT USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "packages_insert" ON packages
    FOR INSERT WITH CHECK (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "packages_update" ON packages
    FOR UPDATE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "packages_delete" ON packages
    FOR DELETE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- AVAILABILITY RULES
DROP POLICY IF EXISTS "availability_own_trainer" ON availability_rules;
DROP POLICY IF EXISTS "availability_public_read" ON availability_rules;

CREATE POLICY "availability_select" ON availability_rules
    FOR SELECT USING (true);

CREATE POLICY "availability_insert" ON availability_rules
    FOR INSERT WITH CHECK (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "availability_update" ON availability_rules
    FOR UPDATE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "availability_delete" ON availability_rules
    FOR DELETE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- BOOKINGS
DROP POLICY IF EXISTS "bookings_own_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_public_read" ON bookings;

CREATE POLICY "bookings_select" ON bookings
    FOR SELECT USING (true);

CREATE POLICY "bookings_insert" ON bookings
    FOR INSERT WITH CHECK (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "bookings_update" ON bookings
    FOR UPDATE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "bookings_delete" ON bookings
    FOR DELETE USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

-- BOOKING EVENTS
DROP POLICY IF EXISTS "booking_events_own_trainer" ON booking_events;

CREATE POLICY "booking_events_select" ON booking_events
    FOR SELECT USING (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));

CREATE POLICY "booking_events_insert" ON booking_events
    FOR INSERT WITH CHECK (trainer_id IN (
        SELECT id FROM trainers WHERE supabase_auth_id = auth.uid()
    ));
