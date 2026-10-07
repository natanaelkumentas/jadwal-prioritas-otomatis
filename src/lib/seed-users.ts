import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, generateRandomPassword } from '@/lib/auth';

const TARGET_URL = 'postgresql://postgres.ldwvsovcsrbbuosyguaw:magangairnavpolimdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

export interface SeedResult {
  success: boolean;
  totalUsers: number;
  csvPath: string;
  error?: string;
  usersSummary: { name: string; email: string; role: string }[];
}

export async function initAndSeedUsers(): Promise<SeedResult> {
  const client = new Client({
    connectionString: TARGET_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 1. Ensure table jadwal.users exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS jadwal.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        staff_id TEXT REFERENCES jadwal.staff(gmail) ON UPDATE CASCADE ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      );

      GRANT ALL ON TABLE jadwal.users TO anon, authenticated, service_role;
      ALTER TABLE jadwal.users ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS service_all_users ON jadwal.users;
      CREATE POLICY service_all_users ON jadwal.users FOR ALL TO service_role USING (true) WITH CHECK (true);
      NOTIFY pgrst, 'reload schema';
    `);

    // 2. Fetch all staff records
    const staffRes = await client.query(`
      SELECT gmail, name, "group", sub_group, role_level
      FROM jadwal.staff
      ORDER BY name ASC
    `);
    const staffRows = staffRes.rows;

    const rootCsvPath = path.resolve(process.cwd(), 'users.csv');
    let existingCredentialsMap = new Map<string, string>();

    if (fs.existsSync(rootCsvPath)) {
      try {
        const fileLines = fs.readFileSync(rootCsvPath, 'utf8').split(/\r?\n/);
        for (const line of fileLines.slice(1)) {
          if (!line.trim()) continue;
          // Split CSV row: "Name","email","pass","role","group","subGroup"
          const parts = line.split('","').map(p => p.replace(/^"|"$/g, ''));
          if (parts.length >= 3) {
            const email = parts[1].toLowerCase().trim();
            const pass = parts[2];
            existingCredentialsMap.set(email, pass);
          }
        }
      } catch (e) {
        console.warn('Error reading existing users.csv:', e);
      }
    }

    const csvRows: string[] = [];
    csvRows.push('Nama,Email,Password,Role,Grup,SubGrup');

    const usersToInsert = [];

    // 3. Developer Account
    const devPassword = existingCredentialsMap.get('natanaelkumentas03@gmail.com') || 'ti7polimdo';
    const devHash = hashPassword(devPassword);
    usersToInsert.push({
      email: 'natanaelkumentas03@gmail.com',
      password_hash: devHash,
      name: 'Developer Utama',
      role: 'developer',
      staff_id: null,
    });
    csvRows.push(`"Developer Utama","natanaelkumentas03@gmail.com","${devPassword}","developer","-","-"`);

    // 4. Admin Account
    const adminPassword = existingCredentialsMap.get('jadwal.airnav.mdc@gmail.com') || 'magangairnavpolimdo2026';
    const adminHash = hashPassword(adminPassword);
    usersToInsert.push({
      email: 'jadwal.airnav.mdc@gmail.com',
      password_hash: adminHash,
      name: 'Administrator Sistem',
      role: 'admin',
      staff_id: null,
    });
    csvRows.push(`"Administrator Sistem","jadwal.airnav.mdc@gmail.com","${adminPassword}","admin","-","-"`);

    // 5. Staff Accounts (Role: user)
    for (const staff of staffRows) {
      const email = (staff.gmail || '').trim().toLowerCase();
      if (!email) continue;

      const password = existingCredentialsMap.get(email) || generateRandomPassword(10);
      const userHash = hashPassword(password);

      usersToInsert.push({
        email: email,
        password_hash: userHash,
        name: staff.name,
        role: 'user',
        staff_id: email,
      });

      const cleanName = (staff.name || '').replace(/"/g, '""');
      const cleanGroup = staff.group || '-';
      const cleanSub = staff.sub_group || '-';
      csvRows.push(`"${cleanName}","${email}","${password}","user","${cleanGroup}","${cleanSub}"`);
    }

    // 6. Upsert all users into database
    for (const u of usersToInsert) {
      await client.query(`
        INSERT INTO jadwal.users (email, password_hash, name, role, staff_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) 
        DO UPDATE SET 
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          staff_id = EXCLUDED.staff_id;
      `, [u.email, u.password_hash, u.name, u.role, u.staff_id]);
    }

    await client.end();

    // 7. Write users.csv to root directory
    const csvContent = csvRows.join('\r\n');
    fs.writeFileSync(rootCsvPath, csvContent, 'utf8');

    return {
      success: true,
      totalUsers: usersToInsert.length,
      csvPath: rootCsvPath,
      usersSummary: usersToInsert.map(u => ({ name: u.name, email: u.email, role: u.role })),
    };
  } catch (err: any) {
    console.error('[seed-users] Error:', err);
    try { await client.end(); } catch {}
    return {
      success: false,
      totalUsers: 0,
      csvPath: '',
      error: err.message || String(err),
      usersSummary: [],
    };
  }
}
