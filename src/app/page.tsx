import { supabaseAdmin } from '@/lib/supabase';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import DashboardContainer from '@/components/DashboardContainer';

export const revalidate = 0; // Disable static cache for live page refresh

export default async function Page() {
  console.log('[Page] Loading dashboard layout and database records...');

  if (!supabaseAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-400 mb-2">Supabase Missing Configuration</h2>
          <p className="text-sm text-slate-400 mb-4">
            Please configure your `.env` file with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to run the application.
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
    <main className="min-h-screen bg-slate-955 text-slate-100 px-6 py-8">
      {/* Dashboard Top Header */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            Smart Automatic Priority Scheduler <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono font-normal">SAPS</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ATS Engineering Unit — Perum LPPNPI Cabang Manado
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-400 font-medium">DSS Engine Online</span>
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
