'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { 
  hashPassword, 
  verifyPassword, 
  setSessionCookie, 
  clearSessionCookie, 
  getSession,
  UserSession,
  UserRole
} from '@/lib/auth';
import { initAndSeedUsers, syncUsersFromCsvToSupabase, parseUsersCsv, SCHEMA_SQL } from '@/lib/seed-users';
import fs from 'fs';
import path from 'path';

/**
 * Append or update a user entry in users.csv in root directory
 */
function appendToUsersCsv(entry: {
  name: string;
  email: string;
  password: string;
  role: string;
  group?: string;
  subGroup?: string;
}) {
  try {
    // Skip filesystem operations on read-only environments (Vercel serverless)
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return;
    }
    const rootCsvPath = path.resolve(process.cwd(), 'users.csv');
    const cleanName = (entry.name || '').replace(/"/g, '""');
    const cleanGroup = entry.group || '-';
    const cleanSub = entry.subGroup || '-';
    const row = `"${cleanName}","${entry.email}","${entry.password}","${entry.role}","${cleanGroup}","${cleanSub}"\r\n`;

    if (!fs.existsSync(rootCsvPath)) {
      const header = 'Nama,Email,Password,Role,Grup,SubGrup\r\n';
      fs.writeFileSync(rootCsvPath, header + row, 'utf8');
    } else {
      fs.appendFileSync(rootCsvPath, row, 'utf8');
    }
  } catch (err) {
    // Gracefully ignore EROFS errors
    console.warn('[auth.ts] Skipped appending to users.csv (read-only environment):', err);
  }
}

/**
 * Check whether jadwal.users table exists in Supabase and count users
 */
export async function getDatabaseAuthStatus() {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin client belum terinisialisasi.' };
    }

    const { data, count, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role', { count: 'exact' })
      .limit(5);

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('does not exist');

      return {
        success: false,
        tableMissing: isMissingTable,
        sql: SCHEMA_SQL,
        error: isMissingTable
          ? 'Tabel jadwal.users belum dibuat di Supabase Cloud.'
          : error.message,
      };
    }

    return {
      success: true,
      tableExists: true,
      userCount: count ?? data?.length ?? 0,
      sampleUsers: data || [],
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Action to manually trigger synchronization from users.csv to Supabase Cloud
 */
export async function syncDatabaseUsersAction() {
  return await syncUsersFromCsvToSupabase();
}

/**
 * Ensure jadwal.users table exists in Supabase
 */
export async function ensureAuthDatabase() {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin client belum terinisialisasi.' };
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('does not exist');

      if (isMissingTable) {
        return {
          success: false,
          tableMissing: true,
          sql: SCHEMA_SQL,
          error: 'Tabel database jadwal.users belum dibuat di Supabase Cloud.',
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Login action: authenticates directly against the Supabase database (jadwal.users)
 */
export async function login(formData: FormData | { email: string; password: string }) {
  try {
    let email = '';
    let password = '';

    if (formData instanceof FormData) {
      email = (formData.get('email') as string || '').trim().toLowerCase();
      password = (formData.get('password') as string || '').trim().replace(/^["']|["']$/g, '');
    } else {
      email = (formData.email || '').trim().toLowerCase();
      password = (formData.password || '').trim().replace(/^["']|["']$/g, '');
    }

    if (!email || !password) {
      return { success: false, error: 'Email dan password wajib diisi.' };
    }

    if (!supabaseAdmin) {
      return { success: false, error: 'Layanan Supabase Admin belum aktif.' };
    }

    // 1. Query user directly from Supabase database table jadwal.users
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, name, role, staff_id')
      .ilike('email', email)
      .maybeSingle();

    if (userErr) {
      const isMissingTable =
        userErr.code === '42P01' ||
        userErr.message?.toLowerCase().includes('does not exist');

      if (isMissingTable) {
        return {
          success: false,
          tableMissing: true,
          error: 'Tabel jadwal.users belum dibuat di database Supabase Cloud. Silakan jalankan script SQL schema di Supabase SQL Editor.',
        };
      }
      console.error('[auth.ts] Database query error:', userErr);
      return { success: false, error: 'Gagal menghubungi database autentikasi.' };
    }

    if (!user) {
      return { success: false, error: 'Email atau kata sandi salah.' };
    }

    // 2. Verify hashed password using scrypt
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Email atau kata sandi salah.' };
    }

    // 3. Update last_login timestamp in Supabase
    try {
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      console.warn('[auth.ts] Failed to update last_login:', e);
    }

    const session: UserSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      staffId: user.staff_id || user.email,
    };

    await setSessionCookie(session);

    return {
      success: true,
      user: session,
    };
  } catch (err: any) {
    console.error('[auth.ts] Login error:', err);
    return { success: false, error: err.message || 'Terjadi kesalahan sistem saat login.' };
  }
}

/**
 * Logout action
 */
export async function logout() {
  await clearSessionCookie();
  return { success: true };
}

/**
 * Get current session user
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  return await getSession();
}

/**
 * Get list of admin accounts (Developer only)
 */
export async function getAdminUsers() {
  const session = await getSession();
  if (!session || session.role !== 'developer') {
    return { success: false, error: 'Hanya developer yang berhak mengakses daftar admin.', admins: [] };
  }

  try {
    const { data, error } = await supabaseAdmin!
      .from('users')
      .select('id, email, name, role, created_at, last_login')
      .in('role', ['admin', 'developer'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, admins: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, admins: [] };
  }
}

/**
 * Create new admin account (Developer only)
 */
export async function createAdminUser(payload: { name: string; email: string; password: string }) {
  const session = await getSession();
  if (!session || session.role !== 'developer') {
    return { success: false, error: 'Hanya developer yang berhak membuat akun admin.' };
  }

  const { name, email, password } = payload;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!name || !cleanEmail || !password) {
    return { success: false, error: 'Nama, email, dan password wajib diisi.' };
  }

  try {
    const passwordHash = hashPassword(password);
    const { data, error } = await supabaseAdmin!
      .from('users')
      .insert({
        name,
        email: cleanEmail,
        password_hash: passwordHash,
        role: 'admin',
        staff_id: null,
      })
      .select('id, email, name, role')
      .single();

    if (error) throw error;

    // Append to users.csv
    appendToUsersCsv({
      name,
      email: cleanEmail,
      password,
      role: 'admin',
      group: '-',
      subGroup: '-',
    });

    return {
      success: true,
      credentials: {
        name,
        email: cleanEmail,
        password,
        role: 'admin',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat akun admin.' };
  }
}

/**
 * Delete admin account (Developer only)
 */
export async function deleteAdminUser(userId: string) {
  const session = await getSession();
  if (!session || session.role !== 'developer') {
    return { success: false, error: 'Hanya developer yang berhak menghapus akun admin.' };
  }

  try {
    // Prevent deleting self or developer
    const { data: target } = await supabaseAdmin!
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (target?.role === 'developer') {
      return { success: false, error: 'Akun developer tidak dapat dihapus.' };
    }

    const { error } = await supabaseAdmin!
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('role', 'admin');

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus admin.' };
  }
}

/**
 * Register user account for staff member (Admin or Developer)
 */
export async function registerStaffUser(payload: {
  name: string;
  email: string;
  password: string;
  group: string;
  subGroup: string;
}) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'developer')) {
    return { success: false, error: 'Akses ditolak.' };
  }

  const { name, email, password, group, subGroup } = payload;
  const cleanEmail = (email || '').trim().toLowerCase();

  try {
    const passwordHash = hashPassword(password);
    const { data, error } = await supabaseAdmin!
      .from('users')
      .upsert({
        name,
        email: cleanEmail,
        password_hash: passwordHash,
        role: 'user',
        staff_id: cleanEmail,
      }, { onConflict: 'email' })
      .select('id, email, name, role')
      .single();

    if (error) throw error;

    // Append to users.csv
    appendToUsersCsv({
      name,
      email: cleanEmail,
      password,
      role: 'user',
      group,
      subGroup,
    });

    return {
      success: true,
      credentials: {
        name,
        email: cleanEmail,
        password,
        role: 'user',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mendaftarkan akun user.' };
  }
}
