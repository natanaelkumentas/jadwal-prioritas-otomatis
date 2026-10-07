import React from 'react';
import { Staff } from '@/lib/scheduler-engine/types';
import PersonalCalendarGrid, { CalendarDayEntry } from './PersonalCalendarGrid';
import {
  getShortCode,
  getShiftTime,
  MONTH_NAMES_ID
} from '@/lib/shift-codes';

interface MonthlyHoursData {
  totalHours: number;
  monthlyLimit: number;
  excessHours: number;
  remainingHours: number;
  isExceeded: boolean;
}

interface PersonalPrintLayoutProps {
  staff: Staff;
  currentYear: number;
  currentMonth: number;
  monthlyHours: MonthlyHoursData;
  todayEntry?: CalendarDayEntry;
  nextDuty?: CalendarDayEntry;
  stats: {
    workDays: number;
    nightShifts: number;
    offDays: number;
    leaveDays: number;
    breakdown: Record<string, number>;
  };
  days: CalendarDayEntry[];
  leadingBlanks: number;
}

export default function PersonalPrintLayout({
  staff,
  currentYear,
  currentMonth,
  monthlyHours,
  todayEntry,
  nextDuty,
  stats,
  days,
  leadingBlanks
}: PersonalPrintLayoutProps) {
  return (
    <div className="hidden print:block text-slate-900 bg-white print:max-h-[100vh] print:overflow-hidden print:page-break-inside-avoid space-y-2">
      {/* === TOP SECTION: INFORMASI PERSONEL, METRIK & TANDA TANGAN === */}
      <div className="space-y-1.5 text-[8px] leading-tight border-b-2 border-slate-900 pb-2">
        {/* Kop AirNav Header */}
        <div className="border-b-2 border-slate-900 pb-1 flex items-center justify-between">
          <div>
            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-900">
              AIRNAV INDONESIA — KANTOR CABANG MANADO (UNIT TEKNIK ATS)
            </div>
            <div className="text-[12px] font-black uppercase tracking-tight text-slate-900">
              JADWAL DINAS SHIFT PERSONAL TEKNISI
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] font-extrabold uppercase text-slate-900">
              {staff.name}
            </div>
            <div className="text-[9px] font-bold text-slate-700 uppercase">
              PERIODE: {MONTH_NAMES_ID[currentMonth - 1].toUpperCase()} {currentYear}
            </div>
          </div>
        </div>

        {/* 3-Column Summary Box Row */}
        <div className="grid grid-cols-3 gap-2 items-stretch">
          {/* Box 1: Profile Summary */}
          <div className="border border-slate-700 rounded p-1.5 bg-slate-50 flex flex-col justify-between">
            <div className="font-bold text-[8.5px] border-b border-slate-300 pb-0.5 mb-1 text-slate-900">
              PROFIL PERSONEL TEKNIK
            </div>
            <div className="space-y-0.5">
              <div><strong>NIP / ID:</strong> {staff.id || staff.gmail}</div>
              <div><strong>Unit/Grup:</strong> {staff.group} {staff.sub_group && staff.sub_group !== '-' ? `(Grup ${staff.sub_group})` : ''}</div>
              <div><strong>Tingkat:</strong> {staff.role_level}</div>
              <div><strong>Lisensi:</strong> {staff.ratings?.join(', ') || '-'}</div>
            </div>
          </div>

          {/* Box 2: Monthly Hours Evaluation */}
          <div className="border border-slate-700 rounded p-1.5 bg-white flex flex-col justify-between">
            <div className="flex justify-between font-bold text-[8.5px] border-b border-slate-300 pb-0.5 mb-1">
              <span>EVALUASI JAM KERJA BULANAN</span>
              <span className={monthlyHours.isExceeded ? 'text-rose-700' : 'text-emerald-700'}>
                {monthlyHours.isExceeded ? 'MELEBIHI BATAS' : 'MEMENUHI STANDAR'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-bold">
              <div className="bg-slate-100 p-1 rounded">
                <div className="text-[7px] text-slate-600">JAM DINAS</div>
                <div className="text-[10px] text-slate-900">{monthlyHours.totalHours} Jam</div>
              </div>
              <div className="bg-slate-100 p-1 rounded">
                <div className="text-[7px] text-slate-600">BATAS MAKS</div>
                <div className="text-[10px] text-slate-900">{monthlyHours.monthlyLimit} Jam</div>
              </div>
              <div className={`p-1 rounded ${monthlyHours.isExceeded ? 'bg-rose-100 text-rose-950' : 'bg-emerald-100 text-emerald-950'}`}>
                <div className="text-[7px]">{monthlyHours.isExceeded ? 'LEBIH' : 'SISA'}</div>
                <div className="text-[10px]">
                  {monthlyHours.isExceeded ? `+${monthlyHours.excessHours}` : `${monthlyHours.remainingHours}`} Jam
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Status Dinas (Hari Ini & Berikutnya) */}
          <div className="border border-slate-700 rounded p-1.5 bg-white flex flex-col justify-between">
            <div className="font-bold text-[8.5px] border-b border-slate-300 pb-0.5 mb-1 text-slate-900">
              STATUS DINAS TEKNISI
            </div>
            <div className="space-y-1">
              <div>
                <div className="font-bold text-[7px] text-slate-600 uppercase">DINAS HARI INI</div>
                {todayEntry ? (
                  <div className="font-bold text-[8px] mt-0.5">
                    [{getShortCode(todayEntry.code)}] {todayEntry.info.label} ({getShiftTime(todayEntry.code, staff.group)})
                  </div>
                ) : (
                  <div className="text-slate-500 text-[7.5px]">Di luar periode</div>
                )}
              </div>
              <div>
                <div className="font-bold text-[7px] text-slate-600 uppercase">DINAS BERIKUTNYA</div>
                {nextDuty ? (
                  <div className="font-bold text-[8px] mt-0.5">
                    Tgl {nextDuty.dayNum}: [{getShortCode(nextDuty.code)}] {nextDuty.info.label}
                  </div>
                ) : (
                  <div className="text-slate-500 text-[7.5px]">Selesai bulan ini</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row: 4 KPI Summary Cards & Shift Composition */}
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* 4 KPI Summary Cards */}
          <div className="col-span-6 grid grid-cols-4 gap-1 text-center">
            <div className="border border-slate-700 rounded p-1 bg-slate-50">
              <div className="text-[7px] font-bold text-slate-600">HARI KERJA</div>
              <div className="text-[9.5px] font-extrabold">{stats.workDays} hr</div>
            </div>
            <div className="border border-slate-700 rounded p-1 bg-slate-50">
              <div className="text-[7px] font-bold text-slate-600">TOTAL JAM</div>
              <div className="text-[9.5px] font-extrabold">{monthlyHours.totalHours} jam</div>
            </div>
            <div className="border border-slate-700 rounded p-1 bg-slate-50">
              <div className="text-[7px] font-bold text-slate-600">SHIFT MALAM</div>
              <div className="text-[9.5px] font-extrabold">{stats.nightShifts} kali</div>
            </div>
            <div className="border border-slate-700 rounded p-1 bg-slate-50">
              <div className="text-[7px] font-bold text-slate-600">LIBUR/IZIN</div>
              <div className="text-[9.5px] font-extrabold">{stats.offDays}/{stats.leaveDays}</div>
            </div>
          </div>

          {/* Shift Composition */}
          <div className="col-span-6 border border-slate-700 rounded p-1 bg-white">
            <div className="font-bold text-[7px] text-slate-700 uppercase mb-0.5">
              KOMPOSISI KODE SHIFT
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => (
                  <span
                    key={code}
                    className="px-1 py-0.2 border border-slate-300 rounded text-[7.5px] font-bold bg-slate-100"
                  >
                    {getShortCode(code)}: {count}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Signatures for Individual Roster */}
        <div className="pt-1 px-4 flex justify-between text-[8px] text-center">
          <div>
            <div className="text-slate-600">Teknisi Yang Bersangkutan:</div>
            <div className="h-8"></div>
            <div className="font-bold border-b border-slate-900 inline-block px-4">
              {staff.name}
            </div>
          </div>
          <div>
            <div className="text-slate-600">
              Manado, ......................... {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
            </div>
            <div className="text-slate-600 mt-0.5">Mengetahui / Supervisor Teknik:</div>
            <div className="h-6"></div>
            <div className="font-bold border-b border-slate-900 inline-block px-6">
              ( .................................................. )
            </div>
          </div>
        </div>
      </div>

      {/* === BOTTOM SECTION: KALENDER DINAS OPERASIONAL (FULL-WIDTH CALENDAR STYLE) === */}
      <div className="pt-0.5">
        <div className="text-[9px] font-extrabold uppercase border-b border-slate-800 pb-0.5 mb-1.5 text-slate-900 flex justify-between items-center">
          <span>KALENDER DINAS OPERASIONAL</span>
          <span className="text-[8px] font-bold text-slate-600">
            UNIT: {staff.group} {staff.sub_group && staff.sub_group !== '-' ? `(Grup ${staff.sub_group})` : ''}
          </span>
        </div>
        <PersonalCalendarGrid
          days={days}
          leadingBlanks={leadingBlanks}
          isLoading={false}
          currentMonth={currentMonth}
          currentYear={currentYear}
          isPrintMode={true}
        />
      </div>
    </div>
  );
}
