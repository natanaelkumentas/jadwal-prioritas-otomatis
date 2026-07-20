-- Create custom database schema for scheduling
CREATE SCHEMA IF NOT EXISTS jadwal;

-- Grant permissions to Supabase API roles for the custom schema
GRANT USAGE ON SCHEMA jadwal TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA jadwal TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA jadwal TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON ROUTINES TO anon, authenticated, service_role;


-- 1. Staff Table
CREATE TABLE IF NOT EXISTS jadwal.staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "group" TEXT NOT NULL, -- 'CNS' or 'ESS'
    sub_group TEXT NOT NULL, -- e.g. 'Grup 1', 'Management', etc.
    role_level TEXT NOT NULL, -- 'Teknisi' or 'Manager Teknik'
    location TEXT NOT NULL DEFAULT 'Cabang Manado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ratings Table
CREATE TABLE IF NOT EXISTS jadwal.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL, -- 'C', 'N', 'S', 'D', 'E1', 'E2', 'E3'
    "group" TEXT NOT NULL, -- 'CNS' or 'ESS'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, "group")
);

-- 3. Staff Ratings Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS jadwal.staff_ratings (
    staff_id TEXT REFERENCES jadwal.staff(id) ON DELETE CASCADE,
    rating_id UUID REFERENCES jadwal.ratings(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, rating_id)
);

-- 4. Shifts Table
CREATE TABLE IF NOT EXISTS jadwal.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT REFERENCES jadwal.staff(id) ON DELETE SET NULL,
    "date" DATE NOT NULL,
    shift_code TEXT NOT NULL, -- 'P', 'S', 'M', 'L', 'Y', 'OH', 'D', 'PS'
    "group" TEXT NOT NULL, -- 'CNS' or 'ESS'
    status TEXT NOT NULL DEFAULT 'Filled', -- 'Filled', 'Gap', 'Pending Approval'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Gap Events Table (Triggered by absences)
CREATE TABLE IF NOT EXISTS jadwal.gap_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES jadwal.shifts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL, -- 'CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT', 'UR'
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Resolved'
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Recommendations Table (Ranked candidate list)
CREATE TABLE IF NOT EXISTS jadwal.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_event_id UUID REFERENCES jadwal.gap_events(id) ON DELETE CASCADE,
    candidate_staff_id TEXT REFERENCES jadwal.staff(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    score_breakdown JSONB NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Audit Log Table (Actions track record)
CREATE TABLE IF NOT EXISTS jadwal.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT, -- User ID or Staff ID who performed action
    action TEXT NOT NULL, -- 'RECOMMENDED', 'APPROVED', 'OVERRIDDEN'
    entity TEXT NOT NULL, -- e.g., 'shifts', 'gap_events'
    entity_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) policies
ALTER TABLE jadwal.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.staff_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.gap_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.audit_log ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY select_staff ON jadwal.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY select_ratings ON jadwal.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY select_staff_ratings ON jadwal.staff_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY select_shifts ON jadwal.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY select_gap_events ON jadwal.gap_events FOR SELECT TO authenticated USING (true);
CREATE POLICY select_recommendations ON jadwal.recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY select_audit_log ON jadwal.audit_log FOR SELECT TO authenticated USING (true);

-- Allow modification of shifts & gap_events to authenticated users (Managers/Admins)
CREATE POLICY update_shifts ON jadwal.shifts FOR UPDATE TO authenticated USING (true);
CREATE POLICY insert_gap_events ON jadwal.gap_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY update_gap_events ON jadwal.gap_events FOR UPDATE TO authenticated USING (true);

-- Allow full administrative access to database service role (used server-side for seeding/engine)
CREATE POLICY service_all_staff ON jadwal.staff FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_ratings ON jadwal.ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_staff_ratings ON jadwal.staff_ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_shifts ON jadwal.shifts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_gap_events ON jadwal.gap_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_recommendations ON jadwal.recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_audit_log ON jadwal.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
