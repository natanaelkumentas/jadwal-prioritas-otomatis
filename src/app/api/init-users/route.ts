import { NextResponse } from 'next/server';
import { syncUsersFromCsvToSupabase, SCHEMA_SQL } from '@/lib/seed-users';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY missing on server',
      }, { status: 500 });
    }

    const result = await syncUsersFromCsvToSupabase();

    if (result.tableMissing) {
      return NextResponse.json({
        success: false,
        tableMissing: true,
        message: 'Tabel jadwal.users belum dibuat di Supabase Cloud. Jalankan script SQL di Supabase SQL Editor.',
        sql: SCHEMA_SQL,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      totalUsers: result.totalUsers,
      usersSummary: result.usersSummary,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || String(err),
    }, { status: 500 });
  }
}
