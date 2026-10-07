import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Client } from 'pg';

const TARGET_URL = 'postgresql://postgres.ldwvsovcsrbbuosyguaw:magangairnavpolimdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const OLD_URL = 'postgresql://postgres.myewtzbhfubufnywzjpo:natanaelkumentas2511@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: any = {};

  // 1. Try direct PostgreSQL client migration on TARGET_URL
  try {
    const client = new Client({
      connectionString: TARGET_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    await client.query(`
      UPDATE jadwal.staff
      SET sub_group = REGEXP_REPLACE(sub_group, '[^0-9]', '', 'g')
      WHERE sub_group ~ '[0-9]';

      UPDATE jadwal.staff
      SET sub_group = '-'
      WHERE role_level = 'Manager Teknik' OR sub_group IS NULL OR sub_group = '';

      NOTIFY pgrst, 'reload schema';
    `);
    const q = await client.query('SELECT name, sub_group, role_level FROM jadwal.staff ORDER BY name LIMIT 5');
    await client.end();
    results.targetPg = { success: true, sample: q.rows };
  } catch (err: any) {
    results.targetPg = { success: false, error: err.message };
  }

  // 2. Try direct PostgreSQL client migration on OLD_URL if active
  try {
    const client = new Client({
      connectionString: OLD_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    await client.query(`
      UPDATE jadwal.staff
      SET sub_group = REGEXP_REPLACE(sub_group, '[^0-9]', '', 'g')
      WHERE sub_group ~ '[0-9]';

      UPDATE jadwal.staff
      SET sub_group = '-'
      WHERE role_level = 'Manager Teknik' OR sub_group IS NULL OR sub_group = '';

      NOTIFY pgrst, 'reload schema';
    `);
    await client.end();
    results.oldPg = { success: true };
  } catch (err: any) {
    results.oldPg = { success: false, error: err.message };
  }

  // 3. Also sanitize via supabaseAdmin
  if (supabaseAdmin) {
    try {
      const { data: staffList } = await supabaseAdmin.from('staff').select('gmail, name, sub_group, role_level');
      let updatedCount = 0;
      for (const s of staffList || []) {
        let clean = s.role_level === 'Manager Teknik' ? '-' : (s.sub_group?.replace(/\D/g, '') || '-');
        if (clean !== s.sub_group) {
          await supabaseAdmin.from('staff').update({ sub_group: clean }).eq('gmail', s.gmail);
          updatedCount++;
        }
      }
      const { data: sampleStaff } = await supabaseAdmin.from('staff').select('name, group, sub_group, role_level').limit(10);
      results.sampleStaff = sampleStaff;
      results.supabaseAdmin = { success: true, updatedCount };
    } catch (err: any) {
      results.supabaseAdmin = { success: false, error: err.message };
    }
  }

  return NextResponse.json(results);
}
