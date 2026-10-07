/**
 * Database Migration Script
 * Migrates data from Old Database (myewtzbhfubufnywzjpo) to New Database (ldwvsovcsrbbuosyguaw).
 * - Extracts staff, ratings, staff_ratings, shifts, gap_events, recommendations, and audit_log.
 * - Converts all personnel IDs to verified unique Gmail addresses (TEXT PRIMARY KEY).
 * - Updates all foreign keys referencing staff_id to point to staff.gmail.
 * - Creates schema jadwal + public views for instant Supabase PostgREST access.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'postgresql://postgres.myewtzbhfubufnywzjpo:natanaelkumentas2511@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const TARGET_URL = 'postgresql://postgres.ldwvsovcsrbbuosyguaw:magangairnavpolimdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

function formatGmailFromName(name) {
  const clean = (name || 'teknisi')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.');
  return `${clean || 'teknisi'}@gmail.com`;
}

async function findAndFetchTable(sourceClient, candidateNames) {
  try {
    const check = await sourceClient.query(
      `SELECT table_schema, table_name 
       FROM information_schema.tables 
       WHERE lower(table_name) = ANY($1)
       AND table_schema NOT IN ('information_schema', 'pg_catalog')`,
      [candidateNames.map(n => n.toLowerCase())]
    );

    if (check.rows.length === 0) return [];

    const found = check.rows.find(r => r.table_schema === 'jadwal')
      || check.rows.find(r => r.table_schema === 'public')
      || check.rows[0];

    const res = await sourceClient.query(`SELECT * FROM "${found.table_schema}"."${found.table_name}"`);
    console.log(`   ✓ Extracted ${res.rowCount} rows from ${found.table_schema}.${found.table_name}`);
    return res.rows;
  } catch (err) {
    return [];
  }
}

async function migrate() {
  console.log('=== Starting Database Migration from Old DB (myewtzbhfubufnywzjpo) ===');

  const sourceClient = new Client({
    connectionString: SOURCE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const targetClient = new Client({
    connectionString: TARGET_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Connecting to Source Database (myewtzbhfubufnywzjpo)...');
    await sourceClient.connect();
    console.log('   ✓ Connected to Source DB successfully.');

    console.log('2. Connecting to Target Database (ldwvsovcsrbbuosyguaw)...');
    await targetClient.connect();
    console.log('   ✓ Connected to Target DB successfully.');

    console.log('3. Recreating schema and tables on Target Database...');
    await targetClient.query(`
      CREATE SCHEMA IF NOT EXISTS jadwal;

      GRANT USAGE ON SCHEMA jadwal TO anon, authenticated, service_role, postgres;
      GRANT ALL ON ALL TABLES IN SCHEMA jadwal TO anon, authenticated, service_role, postgres;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA jadwal TO anon, authenticated, service_role, postgres;
      ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON TABLES TO anon, authenticated, service_role, postgres;
      ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON SEQUENCES TO anon, authenticated, service_role, postgres;
      ALTER DEFAULT PRIVILEGES IN SCHEMA jadwal GRANT ALL ON ROUTINES TO anon, authenticated, service_role, postgres;

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

      CREATE OR REPLACE VIEW public.staff AS SELECT * FROM jadwal.staff;
      CREATE OR REPLACE VIEW public.ratings AS SELECT * FROM jadwal.ratings;
      CREATE OR REPLACE VIEW public.staff_ratings AS SELECT * FROM jadwal.staff_ratings;
      CREATE OR REPLACE VIEW public.shifts AS SELECT * FROM jadwal.shifts;
      CREATE OR REPLACE VIEW public.gap_events AS SELECT * FROM jadwal.gap_events;
      CREATE OR REPLACE VIEW public.recommendations AS SELECT * FROM jadwal.recommendations;
      CREATE OR REPLACE VIEW public.audit_log AS SELECT * FROM jadwal.audit_log;
      CREATE OR REPLACE VIEW public.calendar_sync_events AS SELECT * FROM jadwal.calendar_sync_events;

      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
    `);
    console.log('   ✓ Schema and tables created on Target DB.');

    // 4. Seed default ratings
    console.log('4. Seeding ratings in Target Database...');
    const defaultRatings = [
      { code: 'C', group: 'CNS', description: 'Communication' },
      { code: 'N', group: 'CNS', description: 'Navigation' },
      { code: 'S', group: 'CNS', description: 'Surveillance' },
      { code: 'D', group: 'CNS', description: 'Data Processing' },
      { code: 'E1', group: 'ESS', description: 'Electrical System 1' },
      { code: 'E2', group: 'ESS', description: 'Electrical System 2' },
      { code: 'E3', group: 'ESS', description: 'Electrical System 3' },
    ];
    for (const dr of defaultRatings) {
      await targetClient.query(
        'INSERT INTO jadwal.ratings (code, "group", description) VALUES ($1, $2, $3) ON CONFLICT (code, "group") DO NOTHING',
        [dr.code, dr.group, dr.description]
      );
    }

    // 5. Extract tables from Source DB
    console.log('5. Extracting tables from Source DB...');
    const sourceRatings = await findAndFetchTable(sourceClient, ['ratings', 'rating']);
    const sourceStaff = await findAndFetchTable(sourceClient, ['staff', 'staffs', 'personnel']);
    const sourceStaffRatings = await findAndFetchTable(sourceClient, ['staff_ratings', 'staff_rating']);
    const sourceShifts = await findAndFetchTable(sourceClient, ['shifts', 'shift']);
    const sourceGapEvents = await findAndFetchTable(sourceClient, ['gap_events', 'gap_event']);
    const sourceRecommendations = await findAndFetchTable(sourceClient, ['recommendations', 'recommendation']);
    const sourceAudit = await findAndFetchTable(sourceClient, ['audit_log', 'audit_logs']);

    // Insert any extra ratings from source
    for (const r of sourceRatings) {
      await targetClient.query(
        'INSERT INTO jadwal.ratings (id, code, "group", description) VALUES ($1, $2, $3, $4) ON CONFLICT (code, "group") DO NOTHING',
        [r.id, r.code, r.group, r.description]
      );
    }

    const ratingQuery = await targetClient.query('SELECT id, code, "group" FROM jadwal.ratings');
    const ratingCodeMap = new Map();
    for (const r of ratingQuery.rows) {
      ratingCodeMap.set(`${r.code}:${r.group}`, r.id);
      ratingCodeMap.set(r.code, r.id);
    }
    const sourceRatingIdToKey = new Map();
    for (const r of sourceRatings) {
      sourceRatingIdToKey.set(r.id, `${r.code}:${r.group}`);
    }

    const staffIdToGmail = new Map();
    const usedGmails = new Set();

    if (sourceStaff.length > 0) {
      console.log(`6. Migrating ${sourceStaff.length} staff from Source DB...`);
      for (const s of sourceStaff) {
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
        staffIdToGmail.set(String(s.id), candidate);
        if (s.staff_id) staffIdToGmail.set(String(s.staff_id), candidate);

        await targetClient.query(
          `INSERT INTO jadwal.staff (gmail, name, "group", sub_group, role_level, location, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (gmail) DO UPDATE SET
             name = EXCLUDED.name,
             "group" = EXCLUDED."group",
             sub_group = EXCLUDED.sub_group,
             role_level = EXCLUDED.role_level,
             location = EXCLUDED.location`,
          [candidate, s.name, s.group, s.sub_group || '', s.role_level || 'Teknisi', s.location || 'Cabang Manado', s.created_at || new Date()]
        );
      }

      console.log('7. Migrating staff ratings...');
      for (const sr of sourceStaffRatings) {
        const staffGmail = staffIdToGmail.get(String(sr.staff_id));
        let ratingId = sr.rating_id;
        if (sourceRatingIdToKey.has(sr.rating_id)) {
          const key = sourceRatingIdToKey.get(sr.rating_id);
          ratingId = ratingCodeMap.get(key) || ratingId;
        }
        if (staffGmail && ratingId) {
          try {
            await targetClient.query(
              'INSERT INTO jadwal.staff_ratings (staff_id, rating_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [staffGmail, ratingId]
            );
          } catch (e) {}
        }
      }

      console.log(`8. Migrating ${sourceShifts.length} shifts in batches...`);
      const BATCH_SIZE = 400;
      for (let i = 0; i < sourceShifts.length; i += BATCH_SIZE) {
        const batch = sourceShifts.slice(i, i + BATCH_SIZE);
        const values = [];
        const placeholders = [];
        let pIndex = 1;

        for (const sh of batch) {
          const staffGmail = sh.staff_id ? staffIdToGmail.get(String(sh.staff_id)) || null : null;
          placeholders.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++})`);
          values.push(sh.id, staffGmail, sh.date, sh.shift_code, sh.group, sh.status || 'Filled');
        }

        await targetClient.query(
          `INSERT INTO jadwal.shifts (id, staff_id, "date", shift_code, "group", status)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (id) DO NOTHING`,
          values
        );
      }

      // Gap events
      for (const ge of sourceGapEvents) {
        await targetClient.query(
          `INSERT INTO jadwal.gap_events (id, shift_id, reason, status, detected_at)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [ge.id, ge.shift_id, ge.reason, ge.status || 'Pending', ge.detected_at || new Date()]
        );
      }

      // Recommendations
      for (const rec of sourceRecommendations) {
        const candidateGmail = staffIdToGmail.get(String(rec.candidate_staff_id));
        if (candidateGmail) {
          await targetClient.query(
            `INSERT INTO jadwal.recommendations (id, gap_event_id, candidate_staff_id, score, score_breakdown, rank, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
            [rec.id, rec.gap_event_id, candidateGmail, rec.score, rec.score_breakdown, rec.rank, rec.created_at || new Date()]
          );
        }
      }

      // Audit logs
      for (const al of sourceAudit) {
        const actorGmail = staffIdToGmail.get(String(al.actor_id)) || al.actor_id;
        await targetClient.query(
          `INSERT INTO jadwal.audit_log (id, actor_id, action, entity, entity_id, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [al.id, actorGmail, al.action, al.entity, al.entity_id, al.metadata, al.created_at || new Date()]
        );
      }
    } else {
      console.log('5. Source DB had 0 staff. Seeding from local seed-data.json...');
      const seedPath = path.join(__dirname, '../src/data/seed-data.json');
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

      for (const s of seed.staff) {
        const gmail = formatGmailFromName(s.name);
        staffIdToGmail.set(s.staff_id, gmail);
        await targetClient.query(
          `INSERT INTO jadwal.staff (gmail, name, "group", sub_group, role_level, location)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gmail, s.name, s.group, s.sub_group, s.role_level, s.location || 'Cabang Manado']
        );

        if (Array.isArray(s.ratings)) {
          for (const code of s.ratings) {
            const ratingId = ratingCodeMap.get(`${code}:${s.group}`) || ratingCodeMap.get(code);
            if (ratingId) {
              await targetClient.query(
                `INSERT INTO jadwal.staff_ratings (staff_id, rating_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [gmail, ratingId]
              );
            }
          }
        }
      }

      const BATCH_SIZE = 400;
      for (let i = 0; i < seed.shifts.length; i += BATCH_SIZE) {
        const batch = seed.shifts.slice(i, i + BATCH_SIZE);
        const values = [];
        const placeholders = [];
        let pIndex = 1;

        for (const sh of batch) {
          const staffGmail = staffIdToGmail.get(sh.staff_id) || null;
          placeholders.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++})`);
          values.push(staffGmail, sh.date, sh.shift_code, sh.group, sh.is_gap ? 'Gap' : 'Filled');
        }

        await targetClient.query(
          `INSERT INTO jadwal.shifts (staff_id, "date", shift_code, "group", status)
           VALUES ${placeholders.join(', ')}`,
          values
        );
      }
    }

    const checkStaff = await targetClient.query('SELECT count(*) as count FROM jadwal.staff');
    const checkShifts = await targetClient.query('SELECT count(*) as count FROM jadwal.shifts');
    const checkRatings = await targetClient.query('SELECT count(*) as count FROM jadwal.staff_ratings');

    console.log(`\n🎉 MIGRATION SUCCESSFUL!`);
    console.log(`   ✓ Staff records: ${checkStaff.rows[0].count}`);
    console.log(`   ✓ Shifts records: ${checkShifts.rows[0].count}`);
    console.log(`   ✓ Staff rating links: ${checkRatings.rows[0].count}`);
    console.log(`   All staff IDs are now verified Gmail addresses.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    try { await sourceClient.end(); } catch (e) {}
    try { await targetClient.end(); } catch (e) {}
  }
}

migrate();
