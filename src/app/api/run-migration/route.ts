import { NextResponse } from 'next/server';
import { PurePgClient } from '@/lib/pure-postgres';

export const dynamic = 'force-dynamic';

const SOURCE_URL = 'postgresql://postgres.myewtzbhfubufnywzjpo:natanaelkumentas2511@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const TARGET_URL = 'postgresql://postgres.ldwvsovcsrbbuosyguaw:magangairnavpolimdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

function formatGmailFromName(name: string) {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.');
  return `${clean || 'teknisi'}@gmail.com`;
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

export async function GET() {
  console.log('[API/run-migration] Starting database migration...');
  const sourceClient = new PurePgClient(SOURCE_URL);
  const targetClient = new PurePgClient(TARGET_URL);

  try {
    console.log('[API/run-migration] Connecting to Source DB...');
    await sourceClient.connect();
    console.log('[API/run-migration] Connected to Source DB.');

    console.log('[API/run-migration] Connecting to Target DB...');
    await targetClient.connect();
    console.log('[API/run-migration] Connected to Target DB.');

    // 1. Recreate schema and tables on Target Database
    console.log('[API/run-migration] Recreating schema on Target DB...');
    await targetClient.query(`
      CREATE SCHEMA IF NOT EXISTS jadwal;

      GRANT USAGE ON SCHEMA jadwal TO anon, authenticated, service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA jadwal TO anon, authenticated, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA jadwal TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

      DROP TABLE IF EXISTS jadwal.calendar_sync_events CASCADE;
      DROP TABLE IF EXISTS jadwal.audit_log CASCADE;
      DROP TABLE IF EXISTS jadwal.recommendations CASCADE;
      DROP TABLE IF EXISTS jadwal.gap_events CASCADE;
      DROP TABLE IF EXISTS jadwal.shifts CASCADE;
      DROP TABLE IF EXISTS jadwal.staff_ratings CASCADE;
      DROP TABLE IF EXISTS jadwal.ratings CASCADE;
      DROP TABLE IF EXISTS jadwal.staff CASCADE;

      CREATE TABLE jadwal.staff (
          gmail TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "group" TEXT NOT NULL,
          sub_group TEXT NOT NULL,
          role_level TEXT NOT NULL,
          location TEXT NOT NULL DEFAULT 'Cabang Manado',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE jadwal.ratings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code TEXT NOT NULL,
          "group" TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(code, "group")
      );

      CREATE TABLE jadwal.staff_ratings (
          staff_id TEXT REFERENCES jadwal.staff(gmail) ON DELETE CASCADE,
          rating_id UUID REFERENCES jadwal.ratings(id) ON DELETE CASCADE,
          PRIMARY KEY (staff_id, rating_id)
      );

      CREATE TABLE jadwal.shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id TEXT REFERENCES jadwal.staff(gmail) ON DELETE SET NULL,
          "date" DATE NOT NULL,
          shift_code TEXT NOT NULL,
          "group" TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Filled',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE jadwal.gap_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          shift_id UUID REFERENCES jadwal.shifts(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Pending',
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE jadwal.recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          gap_event_id UUID REFERENCES jadwal.gap_events(id) ON DELETE CASCADE,
          candidate_staff_id TEXT REFERENCES jadwal.staff(gmail) ON DELETE CASCADE,
          score NUMERIC(5,2) NOT NULL,
          score_breakdown JSONB NOT NULL,
          rank INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE jadwal.audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id TEXT,
          action TEXT NOT NULL,
          entity TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE jadwal.calendar_sync_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          shift_id UUID REFERENCES jadwal.shifts(id) ON DELETE CASCADE,
          google_event_id TEXT NOT NULL,
          staff_gmail TEXT NOT NULL,
          synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(shift_id)
      );

      ALTER TABLE jadwal.staff ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.ratings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.staff_ratings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.shifts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.gap_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.recommendations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.audit_log ENABLE ROW LEVEL SECURITY;
      ALTER TABLE jadwal.calendar_sync_events ENABLE ROW LEVEL SECURITY;

      CREATE POLICY select_staff ON jadwal.staff FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_ratings ON jadwal.ratings FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_staff_ratings ON jadwal.staff_ratings FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_shifts ON jadwal.shifts FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_gap_events ON jadwal.gap_events FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_recommendations ON jadwal.recommendations FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_audit_log ON jadwal.audit_log FOR SELECT TO authenticated USING (true);
      CREATE POLICY select_calendar_sync_events ON jadwal.calendar_sync_events FOR SELECT TO authenticated USING (true);

      CREATE POLICY service_all_staff ON jadwal.staff FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_ratings ON jadwal.ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_staff_ratings ON jadwal.staff_ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_shifts ON jadwal.shifts FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_gap_events ON jadwal.gap_events FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_recommendations ON jadwal.recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_audit_log ON jadwal.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY service_all_calendar_sync ON jadwal.calendar_sync_events FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);

    // 2. Fetch data from Source DB
    console.log('[API/run-migration] Fetching source data...');
    const ratingsRes = await sourceClient.query('SELECT * FROM jadwal.ratings');
    const staffRes = await sourceClient.query('SELECT * FROM jadwal.staff');
    const staffRatingsRes = await sourceClient.query('SELECT * FROM jadwal.staff_ratings');
    const shiftsRes = await sourceClient.query('SELECT * FROM jadwal.shifts');
    const gapEventsRes = await sourceClient.query('SELECT * FROM jadwal.gap_events');
    const recsRes = await sourceClient.query('SELECT * FROM jadwal.recommendations');
    const auditRes = await sourceClient.query('SELECT * FROM jadwal.audit_log');

    // 3. Map staff ID -> unique Gmail
    const staffIdToGmail = new Map<string, string>();
    const usedGmails = new Set<string>();

    for (const s of staffRes.rows) {
      let gmail = s.email || s.gmail;
      if (!gmail || !gmail.includes('@')) {
        gmail = formatGmailFromName(s.name);
      }
      let candidate = gmail;
      let counter = 2;
      while (usedGmails.has(candidate)) {
        const parts = gmail.split('@');
        candidate = `${parts[0]}${counter}@${parts[1]}`;
        counter++;
      }
      usedGmails.add(candidate);
      staffIdToGmail.set(s.id, candidate);
    }

    // 4. Insert Ratings into Target DB
    for (const r of ratingsRes.rows) {
      await targetClient.query(`
        INSERT INTO jadwal.ratings (id, code, "group", description, created_at)
        VALUES (${escapeSql(r.id)}, ${escapeSql(r.code)}, ${escapeSql(r.group)}, ${escapeSql(r.description)}, ${escapeSql(r.created_at || new Date().toISOString())})
        ON CONFLICT (code, "group") DO NOTHING
      `);
    }

    // 5. Insert Staff into Target DB (gmail as PK)
    for (const s of staffRes.rows) {
      const gmail = staffIdToGmail.get(s.id);
      await targetClient.query(`
        INSERT INTO jadwal.staff (gmail, name, "group", sub_group, role_level, location, created_at)
        VALUES (${escapeSql(gmail)}, ${escapeSql(s.name)}, ${escapeSql(s.group)}, ${escapeSql(s.sub_group)}, ${escapeSql(s.role_level)}, ${escapeSql(s.location || 'Cabang Manado')}, ${escapeSql(s.created_at || new Date().toISOString())})
      `);
    }

    // 6. Insert Staff Ratings
    for (const sr of staffRatingsRes.rows) {
      const staffGmail = staffIdToGmail.get(sr.staff_id);
      if (staffGmail) {
        await targetClient.query(`
          INSERT INTO jadwal.staff_ratings (staff_id, rating_id)
          VALUES (${escapeSql(staffGmail)}, ${escapeSql(sr.rating_id)})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // 7. Insert Shifts (batched in chunks of 100)
    const shiftChunks: string[] = [];
    for (const sh of shiftsRes.rows) {
      const staffGmail = sh.staff_id ? staffIdToGmail.get(sh.staff_id) || null : null;
      shiftChunks.push(
        `(${escapeSql(sh.id)}, ${escapeSql(staffGmail)}, ${escapeSql(sh.date)}, ${escapeSql(sh.shift_code)}, ${escapeSql(sh.group)}, ${escapeSql(sh.status || 'Filled')}, ${escapeSql(sh.created_at || new Date().toISOString())})`
      );
      if (shiftChunks.length >= 100) {
        await targetClient.query(`
          INSERT INTO jadwal.shifts (id, staff_id, "date", shift_code, "group", status, created_at)
          VALUES ${shiftChunks.join(', ')}
          ON CONFLICT (id) DO NOTHING
        `);
        shiftChunks.length = 0;
      }
    }
    if (shiftChunks.length > 0) {
      await targetClient.query(`
        INSERT INTO jadwal.shifts (id, staff_id, "date", shift_code, "group", status, created_at)
        VALUES ${shiftChunks.join(', ')}
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // 8. Insert Gap Events
    for (const ge of gapEventsRes.rows) {
      await targetClient.query(`
        INSERT INTO jadwal.gap_events (id, shift_id, reason, status, detected_at)
        VALUES (${escapeSql(ge.id)}, ${escapeSql(ge.shift_id)}, ${escapeSql(ge.reason)}, ${escapeSql(ge.status || 'Pending')}, ${escapeSql(ge.detected_at || new Date().toISOString())})
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // 9. Insert Recommendations
    for (const rec of recsRes.rows) {
      const candidateGmail = staffIdToGmail.get(rec.candidate_staff_id);
      if (candidateGmail) {
        await targetClient.query(`
          INSERT INTO jadwal.recommendations (id, gap_event_id, candidate_staff_id, score, score_breakdown, rank, created_at)
          VALUES (${escapeSql(rec.id)}, ${escapeSql(rec.gap_event_id)}, ${escapeSql(candidateGmail)}, ${escapeSql(rec.score)}, ${escapeSql(rec.score_breakdown)}, ${escapeSql(rec.rank)}, ${escapeSql(rec.created_at || new Date().toISOString())})
          ON CONFLICT (id) DO NOTHING
        `);
      }
    }

    // 10. Insert Audit Log
    for (const al of auditRes.rows) {
      const actorGmail = staffIdToGmail.get(al.actor_id) || al.actor_id;
      await targetClient.query(`
        INSERT INTO jadwal.audit_log (id, actor_id, action, entity, entity_id, metadata, created_at)
        VALUES (${escapeSql(al.id)}, ${escapeSql(actorGmail)}, ${escapeSql(al.action)}, ${escapeSql(al.entity)}, ${escapeSql(al.entity_id)}, ${escapeSql(al.metadata)}, ${escapeSql(al.created_at || new Date().toISOString())})
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // Verify row counts in Target DB
    const checkStaff = await targetClient.query('SELECT count(*) as count FROM jadwal.staff');
    const checkShifts = await targetClient.query('SELECT count(*) as count FROM jadwal.shifts');
    const checkRatings = await targetClient.query('SELECT count(*) as count FROM jadwal.ratings');

    console.log('[API/run-migration] Migration succeeded!');

    const mappingObj: Record<string, string> = {};
    staffIdToGmail.forEach((gmail, oldId) => {
      mappingObj[oldId] = gmail;
    });

    return NextResponse.json({
      success: true,
      message: 'Migrasi database berhasil diselesaikan!',
      sourceCounts: {
        staff: staffRes.rowCount,
        shifts: shiftsRes.rowCount,
        ratings: ratingsRes.rowCount,
        staffRatings: staffRatingsRes.rowCount,
        gapEvents: gapEventsRes.rowCount,
        recommendations: recsRes.rowCount,
        auditLog: auditRes.rowCount
      },
      targetCounts: {
        staff: checkStaff.rows[0]?.count,
        shifts: checkShifts.rows[0]?.count,
        ratings: checkRatings.rows[0]?.count
      },
      staffMapping: mappingObj
    });
  } catch (err: any) {
    console.error('[API/run-migration] Migration error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}
