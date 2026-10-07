import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword, generateRandomPassword } from '@/lib/auth';

export const SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS jadwal;

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

ALTER TABLE jadwal.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_all_users ON jadwal.users;
CREATE POLICY service_all_users ON jadwal.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS select_users ON jadwal.users;
CREATE POLICY select_users ON jadwal.users FOR SELECT TO authenticated USING (true);

GRANT ALL ON TABLE jadwal.users TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
`;

export interface CsvUserRecord {
  name: string;
  email: string;
  password: string;
  role: string;
  group?: string;
  subGroup?: string;
}

export interface SeedResult {
  success: boolean;
  totalUsers: number;
  csvPath: string;
  tableMissing?: boolean;
  error?: string;
  usersSummary: { name: string; email: string; role: string }[];
}

/**
 * Robust CSV parser for users.csv
 */
export function parseUsersCsv(csvContent: string): CsvUserRecord[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const results: CsvUserRecord[] = [];
  // Skip header: Nama,Email,Password,Role,Grup,SubGrup
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    tokens.push(current.trim());

    if (tokens.length >= 3) {
      results.push({
        name: tokens[0]?.replace(/^"|"$/g, '').trim() || '',
        email: tokens[1]?.replace(/^"|"$/g, '').toLowerCase().trim() || '',
        password: tokens[2]?.replace(/^"|"$/g, '').trim() || '',
        role: tokens[3]?.replace(/^"|"$/g, '').trim() || 'user',
        group: tokens[4] ? tokens[4].replace(/^"|"$/g, '').trim() : '-',
        subGroup: tokens[5] ? tokens[5].replace(/^"|"$/g, '').trim() : '-',
      });
    }
  }

  return results;
}

import { DEFAULT_USERS } from './default-users';

/**
 * Synchronize all accounts to Supabase Cloud database via HTTPS REST (supabaseAdmin).
 * Reads users.csv if available locally, or falls back to DEFAULT_USERS on serverless runtime.
 */
export async function syncUsersFromCsvToSupabase(): Promise<SeedResult> {
  const rootCsvPath = path.resolve(process.cwd(), 'users.csv');
  let records: CsvUserRecord[] = [];

  if (fs.existsSync(rootCsvPath)) {
    try {
      const csvContent = fs.readFileSync(rootCsvPath, 'utf8');
      records = parseUsersCsv(csvContent);
    } catch (e) {
      console.warn('[seed-users] Could not read users.csv, falling back to DEFAULT_USERS:', e);
    }
  }

  // Fallback to static default users if users.csv is absent (e.g. in Vercel environment)
  if (records.length === 0) {
    records = DEFAULT_USERS.map((u) => ({
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      group: u.group,
      subGroup: u.subGroup,
    }));
  }

  if (!supabaseAdmin) {
    return {
      success: false,
      totalUsers: 0,
      csvPath: rootCsvPath,
      error: 'Supabase admin client belum terkonfigurasi (SUPABASE_SERVICE_ROLE_KEY missing).',
      usersSummary: [],
    };
  }

  try {
    // Check if jadwal.users table exists in Supabase
    const { error: testErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (testErr) {
      const isMissingTable =
        testErr.code === '42P01' ||
        testErr.message?.toLowerCase().includes('does not exist');

      if (isMissingTable) {
        return {
          success: false,
          tableMissing: true,
          totalUsers: 0,
          csvPath: rootCsvPath,
          error: 'Tabel jadwal.users belum dibuat di database Supabase. Jalankan script SQL schema di Supabase SQL Editor.',
          usersSummary: [],
        };
      }
      return {
        success: false,
        totalUsers: 0,
        csvPath: rootCsvPath,
        error: testErr.message,
        usersSummary: [],
      };
    }

    // Prepare users payload for upsert
    const usersToInsert = records.map((r) => ({
      email: r.email,
      password_hash: hashPassword(r.password),
      name: r.name,
      role: r.role,
      staff_id: null,
    }));

    // Perform batch upsert
    const { error: upsertErr } = await supabaseAdmin
      .from('users')
      .upsert(usersToInsert, { onConflict: 'email' });

    if (upsertErr) {
      console.error('[seed-users] Upsert error:', upsertErr);
      return {
        success: false,
        totalUsers: 0,
        csvPath: rootCsvPath,
        error: upsertErr.message,
        usersSummary: [],
      };
    }

    return {
      success: true,
      totalUsers: usersToInsert.length,
      csvPath: rootCsvPath,
      usersSummary: records.map((r) => ({ name: r.name, email: r.email, role: r.role })),
    };
  } catch (err: any) {
    console.error('[seed-users] Sync error:', err);
    return {
      success: false,
      totalUsers: 0,
      csvPath: rootCsvPath,
      error: err.message || String(err),
      usersSummary: [],
    };
  }
}

/**
 * Seed users helper: calls HTTPS sync from users.csv to Supabase
 */
export async function initAndSeedUsers(): Promise<SeedResult> {
  return await syncUsersFromCsvToSupabase();
}
