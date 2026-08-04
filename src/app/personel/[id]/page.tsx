import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { getStaffMonthlySchedule } from '@/app/actions/scheduler';
import PersonalScheduleView from '@/components/PersonalScheduleView';
import ThemeToggle from '@/components/ThemeToggle';
import { MONTH_NAMES_ID } from '@/lib/shift-codes';
import { FiArrowLeft, FiUser, FiAlertCircle } from 'react-icons/fi';

export const revalidate = 0; // Always render the latest roster state

interface PersonalPageProps {
  params: { id: string };
  searchParams: { tahun?: string; bulan?: string };
}

export async function generateMetadata({ params }: PersonalPageProps) {
  const staffId = decodeURIComponent(params.id);

  const { data: staff } = supabaseAdmin
    ? await supabaseAdmin.from('staff').select('name').eq('id', staffId).maybeSingle()
    : { data: null };

  return {
    title: staff?.name
      ? `Jadwal Dinas ${staff.name} — SAPS`
      : 'Jadwal Dinas Personal — SAPS'
  };
}

export default async function PersonalSchedulePage({ params, searchParams }: PersonalPageProps) {
  const staffId = decodeURIComponent(params.id);

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-500 dark:text-red-400 mb-2">Konfigurasi Supabase Belum Lengkap</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Lengkapi berkas `.env` untuk menampilkan jadwal dinas personal.
          </p>
        </div>
      </main>
    );
  }

  // Resolve the requested period (defaults to the running month)
  const now = new Date();
  const parsedYear = Number(searchParams?.tahun);
  const parsedMonth = Number(searchParams?.bulan);
  const currentYear = Number.isInteger(parsedYear) && parsedYear > 1970 ? parsedYear : now.getFullYear();
  const currentMonth =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : now.getMonth() + 1;

  const { data: staffData } = await supabaseAdmin
    .from('staff')
    .select('*, staff_ratings(rating:ratings(code))')
    .eq('id', staffId)
    .maybeSingle();

  if (!staffData) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg text-center">
          <FiAlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">Personel Tidak Ditemukan</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Data personel dengan ID <strong className="font-mono">{staffId}</strong> tidak terdaftar pada direktori teknik.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const staff: Staff = {
    id: staffData.id,
    name: staffData.name,
    group: staffData.group,
    sub_group: staffData.sub_group,
    role_level: staffData.role_level,
    location: staffData.location,
    ratings: staffData.staff_ratings?.map((sr: any) => sr.rating?.code).filter(Boolean) || []
  };

  const schedule = await getStaffMonthlySchedule(staff.id, currentYear, currentMonth);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-2.5 sm:px-6 py-4 sm:py-8 transition-colors duration-200">
      {/* Personal Header */}
      <div className="mb-3 sm:mb-6 border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors print:hidden"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard Roster</span>
          </Link>
          <div className="print:hidden">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <FiUser className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {staff.name}
            </h1>
            <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Jadwal Dinas Personal — {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
            </p>
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1.5">
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded">
                {staff.id}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded">
                {staff.group} · {staff.sub_group}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded">
                {staff.role_level}
              </span>
              {staff.ratings?.map(rating => (
                <span
                  key={rating}
                  className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded"
                  title="Rating Lisensi ATSEP"
                >
                  {rating}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PersonalScheduleView
        staff={staff}
        initialShifts={schedule.shifts as Shift[]}
        initialGapEvents={schedule.gapEvents as GapEvent[]}
        initialYear={currentYear}
        initialMonth={currentMonth}
      />
    </main>
  );
}
