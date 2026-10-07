import { supabaseAdmin } from '@/lib/supabase';
import { Staff, Shift } from '@/lib/scheduler-engine/types';
import PrintRosterView from '@/components/PrintRosterView';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 0;

interface CetakPageProps {
  searchParams: { tahun?: string; bulan?: string };
}

export async function generateMetadata({ searchParams }: CetakPageProps) {
  const now = new Date();
  const year = Number(searchParams?.tahun) || now.getFullYear();
  const month = Number(searchParams?.bulan) || now.getMonth() + 1;

  return {
    title: `Cetak Jadwal Dinas Roster — ${month}/${year}`
  };
}

export default async function CetakPage({ searchParams }: CetakPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const now = new Date();
  const year = Number(searchParams?.tahun) || now.getFullYear();
  const month = Number(searchParams?.bulan) || now.getMonth() + 1;

  const totalDays = new Date(year, month, 0).getDate();
  const formattedMonth = month.toString().padStart(2, '0');
  const startDate = `${year}-${formattedMonth}-01`;
  const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

  const { data: staffData } = await supabaseAdmin!
    .from('staff')
    .select('*, staff_ratings(rating:ratings(code))')
    .eq('location', 'Cabang Manado')
    .order('name');

  const { data: shiftsData } = await supabaseAdmin!
    .from('shifts')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  const staffList: Staff[] = (staffData || []).map((s: any) => ({
    id: s.gmail || s.id,
    gmail: s.gmail || s.id,
    name: s.name,
    group: s.group,
    sub_group: s.sub_group,
    role_level: s.role_level,
    location: s.location,
    ratings: s.staff_ratings?.map((sr: any) => sr.rating?.code).filter(Boolean) || []
  }));

  const shifts: Shift[] = (shiftsData || []) as Shift[];

  return (
    <PrintRosterView
      staffList={staffList}
      shifts={shifts}
      year={year}
      month={month}
    />
  );
}
