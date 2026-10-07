import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { getStaffMonthlySchedule } from '@/app/actions/scheduler';
import PersonalScheduleView from '@/components/PersonalScheduleView';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

export const revalidate = 0; // Always render the latest roster state

interface PersonalPageProps {
  params: { id: string };
  searchParams: { tahun?: string; bulan?: string };
}

export async function generateMetadata({ params }: PersonalPageProps) {
  const staffIdentifier = decodeURIComponent(params.id).trim();

  let staffName = '';
  if (supabaseAdmin) {
    const { data: byName } = await supabaseAdmin
      .from('staff')
      .select('name')
      .ilike('name', staffIdentifier)
      .maybeSingle();
    if (byName) {
      staffName = byName.name;
    } else {
      const { data: byId } = await supabaseAdmin
        .from('staff')
        .select('name')
        .or(`gmail.eq.${staffIdentifier},id.eq.${staffIdentifier}`)
        .maybeSingle();
      if (byId) staffName = byId.name;
    }
  }

  return {
    title: staffName
      ? `Jadwal Dinas ${staffName} — SAPS`
      : `Jadwal Dinas ${staffIdentifier} — SAPS`
  };
}

export default async function PersonalSchedulePage({ params, searchParams }: PersonalPageProps) {
  const staffIdentifier = decodeURIComponent(params.id).trim();

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

  // 1. Try matching by full name first
  let staffData: any = null;
  const { data: byName } = await supabaseAdmin
    .from('staff')
    .select('*, staff_ratings(rating:ratings(code))')
    .ilike('name', staffIdentifier)
    .maybeSingle();

  if (byName) {
    staffData = byName;
  } else {
    // 2. Fallback to gmail or id
    const { data: byIdOrGmail } = await supabaseAdmin
      .from('staff')
      .select('*, staff_ratings(rating:ratings(code))')
      .or(`gmail.eq.${staffIdentifier},id.eq.${staffIdentifier}`)
      .maybeSingle();
    staffData = byIdOrGmail;
  }

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
    id: staffData.gmail || staffData.id,
    gmail: staffData.gmail || staffData.id,
    name: staffData.name,
    group: staffData.group,
    sub_group: staffData.sub_group,
    role_level: staffData.role_level,
    location: staffData.location,
    ratings: staffData.staff_ratings?.map((sr: any) => sr.rating?.code).filter(Boolean) || []
  };

  const schedule = await getStaffMonthlySchedule(staff.id, currentYear, currentMonth);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-2 sm:px-4 py-3 sm:py-5 transition-colors duration-200 print:bg-white print:p-0 print:m-0">
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
