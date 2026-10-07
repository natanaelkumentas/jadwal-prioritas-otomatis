-- Custom database schema for scheduling (jadwal)
CREATE SCHEMA IF NOT EXISTS jadwal;

-- Grant permissions to Supabase API roles for the custom schema
GRANT USAGE ON SCHEMA jadwal TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA jadwal TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA jadwal TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 1. Staff Table (Primary Key: gmail)
CREATE TABLE IF NOT EXISTS jadwal.staff (
    gmail TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "group" TEXT NOT NULL, -- 'CNS' or 'ESS'
    sub_group TEXT NOT NULL, -- 'Grup 1', 'Grup 2', 'Management', etc.
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

-- 3. Staff Ratings Junction Table (References staff.gmail)
CREATE TABLE IF NOT EXISTS jadwal.staff_ratings (
    staff_id TEXT REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE CASCADE,
    rating_id UUID REFERENCES jadwal.ratings(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, rating_id)
);

-- 4. Shifts Table (References staff.gmail)
CREATE TABLE IF NOT EXISTS jadwal.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE SET NULL,
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
    candidate_staff_id TEXT REFERENCES jadwal.staff(gmail) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    score_breakdown JSONB NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Audit Log Table (Actions track record)
CREATE TABLE IF NOT EXISTS jadwal.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT, -- User ID or Staff ID who performed action
    action TEXT NOT NULL,
    entity TEXT NOT NULL, -- 'shifts', 'gap_events'
    entity_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Calendar Sync Events Table (Tracking Google Calendar event IDs)
CREATE TABLE IF NOT EXISTS jadwal.calendar_sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES jadwal.shifts(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    staff_gmail TEXT NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shift_id)
);

-- 9. Users Table for Authentication & Role-Based Access Control
CREATE TABLE IF NOT EXISTS jadwal.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'developer', 'admin', 'user'
    staff_id TEXT REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE jadwal.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.staff_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.gap_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.calendar_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal.users ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY select_staff ON jadwal.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY select_ratings ON jadwal.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY select_staff_ratings ON jadwal.staff_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY select_shifts ON jadwal.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY select_gap_events ON jadwal.gap_events FOR SELECT TO authenticated USING (true);
CREATE POLICY select_recommendations ON jadwal.recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY select_audit_log ON jadwal.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY select_calendar_sync_events ON jadwal.calendar_sync_events FOR SELECT TO authenticated USING (true);
CREATE POLICY select_users ON jadwal.users FOR SELECT TO authenticated USING (true);

-- Allow full administrative access to database service role
CREATE POLICY service_all_staff ON jadwal.staff FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_ratings ON jadwal.ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_staff_ratings ON jadwal.staff_ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_shifts ON jadwal.shifts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_gap_events ON jadwal.gap_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_recommendations ON jadwal.recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_audit_log ON jadwal.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_calendar_sync ON jadwal.calendar_sync_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_all_users ON jadwal.users FOR ALL TO service_role USING (true) WITH CHECK (true);

