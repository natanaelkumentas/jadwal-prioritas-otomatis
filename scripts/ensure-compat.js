const { Client } = require('pg');

const TARGET_URL = 'postgresql://postgres.ldwvsovcsrbbuosyguaw:magangairnavpolimdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

async function fix() {
  const client = new Client({
    connectionString: TARGET_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Target DB.');

    // Add id column and auto-sync trigger to jadwal.staff
    await client.query(`
      ALTER TABLE jadwal.staff ADD COLUMN IF NOT EXISTS id TEXT;
      UPDATE jadwal.staff SET id = gmail WHERE id IS NULL;

      CREATE OR REPLACE FUNCTION jadwal.sync_staff_id_gmail()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.gmail IS NULL AND NEW.id IS NOT NULL THEN
          NEW.gmail := NEW.id;
        END IF;
        IF NEW.id IS NULL AND NEW.gmail IS NOT NULL THEN
          NEW.id := NEW.gmail;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sync_staff_id_gmail ON jadwal.staff;
      CREATE TRIGGER trg_sync_staff_id_gmail
      BEFORE INSERT OR UPDATE ON jadwal.staff
      FOR EACH ROW EXECUTE FUNCTION jadwal.sync_staff_id_gmail();

      DROP VIEW IF EXISTS public.staff CASCADE;
      CREATE OR REPLACE VIEW public.staff AS SELECT * FROM jadwal.staff;

      ALTER TABLE jadwal.shifts DROP CONSTRAINT IF EXISTS shifts_staff_id_fkey;
      ALTER TABLE jadwal.shifts ADD CONSTRAINT shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE SET NULL;

      ALTER TABLE jadwal.staff_ratings DROP CONSTRAINT IF EXISTS staff_ratings_staff_id_fkey;
      ALTER TABLE jadwal.staff_ratings ADD CONSTRAINT staff_ratings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE CASCADE;

      ALTER TABLE jadwal.recommendations DROP CONSTRAINT IF EXISTS recommendations_candidate_staff_id_fkey;
      ALTER TABLE jadwal.recommendations ADD CONSTRAINT recommendations_candidate_staff_id_fkey FOREIGN KEY (candidate_staff_id) REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE CASCADE;

      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;

      NOTIFY pgrst, 'reload schema';
    `);

    console.log('✓ Target DB schema updated with id <-> gmail compatibility sync.');
  } catch (err) {
    console.error('Error fixing schema:', err);
  } finally {
    await client.end();
  }
}

fix();
