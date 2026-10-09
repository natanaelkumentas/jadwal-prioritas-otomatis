import { supabaseAdmin } from '@/lib/supabase';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import DashboardContainer from '@/components/DashboardContainer';
import ThemeToggle from '@/components/ThemeToggle';
import NavbarUserPill from '@/components/NavbarUserPill';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { i18n } from '@/lib/i18n';

export const revalidate = 0; // Disable static cache for live page refresh

export default async function Page() {
  console.log('[Page] Loading dashboard layout and database records...');

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!supabaseAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-500 dark:text-red-400 mb-2">Konfigurasi Supabase Belum Lengkap</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Silakan lengkapi berkas `.env` dengan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` untuk menjalankan aplikasi.
          </p>
        </div>
      </div>
    );
  }

  // 1. Fetch initial database records
  const now = new Date();
  const initialYear = now.getFullYear();
  const initialMonth = now.getMonth() + 1; // 1-12
  const formattedMonth = initialMonth.toString().padStart(2, '0');
  const totalDays = new Date(initialYear, initialMonth, 0).getDate();
  const startDate = `${initialYear}-${formattedMonth}-01`;
  const endDate = `${initialYear}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

  const { data: staffData } = await supabaseAdmin!
    .from('staff')
    .select('*, staff_ratings(rating:ratings(code))')
    .eq('location', 'Cabang Manado');

  const { data: shiftsData } = await supabaseAdmin!
    .from('shifts')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  const { data: gapEventsData } = await supabaseAdmin!
    .from('gap_events')
    .select('*')
    .eq('status', 'Pending');

  // Format profiles rating arrays
  const initialStaff: Staff[] = (staffData || []).map((s: any) => ({
    id: s.id || s.gmail,
    gmail: s.gmail || s.id,
    name: s.name,
    group: s.group,
    sub_group: s.sub_group,
    role_level: s.role_level,
    location: s.location,
    ratings: s.staff_ratings?.map((sr: any) => sr.rating?.code).filter(Boolean) || []
  }));

  const initialShifts = (shiftsData || []) as Shift[];
  const initialGapEvents = (gapEventsData || []) as GapEvent[];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-2.5 sm:px-6 py-3 sm:py-8 transition-colors duration-200">
      {/* Dashboard Top Header */}
      <header className="mb-3 sm:mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 sm:pb-4 gap-2 sm:gap-4">
        {/* Left: App Branding */}
        <div className="min-w-0 flex-shrink">
          <h1 className="text-sm sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="sm:hidden font-extrabold text-blue-600 dark:text-blue-400">SAPS</span>
            <span className="sm:hidden truncate text-slate-800 dark:text-slate-100 font-bold">ATS</span>
            <span className="hidden sm:inline">{i18n.appTitle}</span>
            <span className="text-[9px] sm:text-xs bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0" title="SAPS Version 0.12.2">v0.12.2</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 truncate hidden sm:block">
            {i18n.appSubtitle}
          </p>
        </div>

        {/* Right: Actions, Theme Toggle, & User Pill */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20" title="Database Real-time Supabase Cloud Terhubung">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold hidden xs:inline">Aktif</span>
          </div>
          <ThemeToggle />
          <NavbarUserPill user={currentUser} />
        </div>
      </header>

      <DashboardContainer
        initialStaff={initialStaff}
        initialShifts={initialShifts}
        initialGapEvents={initialGapEvents}
        initialYear={initialYear}
        initialMonth={initialMonth}
        currentUser={currentUser}
      />
    </main>
  );
}
