import { supabaseAdmin } from '@/lib/supabase';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import DashboardContainer from '@/components/DashboardContainer';
import { i18n } from '@/lib/i18n';

export const revalidate = 0; // Disable static cache for live page refresh

export default async function Page() {
  console.log('[Page] Loading dashboard layout and database records...');

  if (!supabaseAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-400 mb-2">Konfigurasi Supabase Belum Lengkap</h2>
          <p className="text-sm text-slate-400 mb-4">
            Silakan lengkapi berkas `.env` dengan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` untuk menjalankan aplikasi.
          </p>
        </div>
      </div>
    );
  }

  // 1. Fetch initial database records
  const { data: staffData } = await supabaseAdmin!
    .from('staff')
    .select('*, staff_ratings(rating:ratings(code))')
    .eq('location', 'Cabang Manado');

  const { data: shiftsData } = await supabaseAdmin!
    .from('shifts')
    .select('*')
    .gte('date', '2026-07-01')
    .lte('date', '2026-07-31')
    .order('date', { ascending: true });

  const { data: gapEventsData } = await supabaseAdmin!
    .from('gap_events')
    .select('*')
    .eq('status', 'Pending');

  // Format profiles rating arrays
  const initialStaff: Staff[] = (staffData || []).map((s: any) => ({
    id: s.id,
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
    <main className="min-h-screen bg-slate-955 text-slate-100 px-2.5 sm:px-6 py-4 sm:py-8">
      {/* Dashboard Top Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 gap-2 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-2xl font-bold text-slate-100 tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span>{i18n.appTitle}</span>
            <span className="text-[10px] sm:text-xs bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono font-normal">SAPS</span>
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5">
            {i18n.appSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-400 font-medium">Sistem Rekomendasi Aktif</span>
        </div>
      </div>

      <DashboardContainer
        initialStaff={initialStaff}
        initialShifts={initialShifts}
        initialGapEvents={initialGapEvents}
      />
    </main>
  );
}
