'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { getStaffMonthlySchedule } from '@/app/actions/scheduler';
import { supabaseClient } from '@/lib/supabase';
import Skeleton from './Skeleton';
import MonthYearPickerModal from './MonthYearPickerModal';
import ShiftCodeModal from './ShiftCodeModal';
import MonthlyHoursCard from './personal/MonthlyHoursCard';
import PersonalCalendarGrid, { CalendarDayEntry } from './personal/PersonalCalendarGrid';
import PersonalListView from './personal/PersonalListView';
import PersonalPrintLayout from './personal/PersonalPrintLayout';
import CalendarSyncModal from './CalendarSyncModal';
import { calculateStaffMonthlyHours } from '@/lib/labor-rules/hours';
import {
  getShiftInfo,
  getShortCode,
  getShiftTime,
  MONTH_NAMES_ID
} from '@/lib/shift-codes';
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiSun,
  FiMoon,
  FiCoffee,
  FiBriefcase,
  FiGrid,
  FiList,
  FiPrinter,
  FiInfo,
  FiArrowLeft,
  FiUser
} from 'react-icons/fi';

interface PersonalScheduleViewProps {
  staff: Staff;
  initialShifts: Shift[];
  initialGapEvents: GapEvent[];
  initialYear: number;
  initialMonth: number;
}

type ViewMode = 'kalender' | 'daftar';

const pad = (value: number) => value.toString().padStart(2, '0');

export default function PersonalScheduleView({
  staff,
  initialShifts,
  initialGapEvents,
  initialYear,
  initialMonth
}: PersonalScheduleViewProps) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [gapEvents, setGapEvents] = useState<GapEvent[]>(initialGapEvents);
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kalender');
  const [workOnly, setWorkOnly] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const fetchSchedule = async (year: number, month: number) => {
    setIsLoading(true);
    try {
      const res = await getStaffMonthlySchedule(staff.id, year, month);
      if (res.success) {
        setShifts(res.shifts as Shift[]);
        setGapEvents(res.gapEvents as GapEvent[]);
      }
    } catch (err) {
      console.error('[PersonalScheduleView] Error fetching personal schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabaseClient
      .channel(`personal-schedule-${staff.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'jadwal', table: 'shifts', filter: `staff_id=eq.${staff.id}` },
        () => {
          getStaffMonthlySchedule(staff.id, currentYear, currentMonth).then(res => {
            if (res.success) {
              setShifts(res.shifts as Shift[]);
              setGapEvents(res.gapEvents as GapEvent[]);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [staff.id, currentYear, currentMonth]);

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    fetchSchedule(year, month);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) handleMonthChange(currentYear - 1, 12);
    else handleMonthChange(currentYear, currentMonth - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) handleMonthChange(currentYear + 1, 1);
    else handleMonthChange(currentYear, currentMonth + 1);
  };

  const days: CalendarDayEntry[] = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const shiftByDate = new Map(shifts.map(s => [s.date, s]));
    const pendingShiftIds = new Set(
      gapEvents.filter(g => g.status === 'Pending').map(g => g.shift_id)
    );

    return Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      const date = `${currentYear}-${pad(currentMonth)}-${pad(dayNum)}`;
      const shift = shiftByDate.get(date);
      const code = shift?.shift_code || 'L';
      const info = getShiftInfo(code);
      const weekday = new Date(currentYear, currentMonth - 1, dayNum).getDay();

      return {
        dayNum,
        date,
        weekday,
        shift,
        code,
        info,
        isToday: date === todayStr,
        hasPendingGap: shift ? pendingShiftIds.has(shift.id) : false
      };
    });
  }, [shifts, gapEvents, currentYear, currentMonth, todayStr]);

  const monthlyHours = useMemo(() => {
    return calculateStaffMonthlyHours(shifts, staff.group, currentYear, currentMonth);
  }, [shifts, staff.group, currentYear, currentMonth]);

  const stats = useMemo(() => {
    const breakdown: Record<string, number> = {};
    let workDays = 0;
    let offDays = 0;
    let leaveDays = 0;
    let nightShifts = 0;

    days.forEach(({ code, info }) => {
      const normalized = code.toUpperCase();
      breakdown[normalized] = (breakdown[normalized] || 0) + 1;

      if (info.category === 'work') {
        workDays += 1;
        if (normalized === 'M') nightShifts += 1;
      } else if (info.category === 'leave') {
        leaveDays += 1;
      } else {
        offDays += 1;
      }
    });

    return { breakdown, workDays, offDays, leaveDays, nightShifts };
  }, [days]);

  const todayEntry = days.find(d => d.isToday);
  const nextDuty = days.find(d => d.date > todayStr && d.info.category === 'work');
  const listEntries = workOnly ? days.filter(d => d.info.category !== 'off') : days;
  const leadingBlanks = days.length > 0 ? days[0].weekday : 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 1. SINGLE ROW TOP BAR: [ all info ] [ date selection ] [ kalender | daftar ] [ print ] */}
      <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 shadow-xs print:hidden">
        {/* [ all info ] */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
          <Link
            href="/"
            className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors shrink-0"
            title="Kembali ke Dashboard Roster"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <FiUser className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {staff.name}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded whitespace-nowrap">
                {staff.group} · {staff.sub_group}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded hidden md:inline whitespace-nowrap">
                {staff.role_level}
              </span>
              {staff.ratings?.map(r => (
                <span
                  key={r}
                  className="px-1 py-0.5 text-[8.5px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded hidden lg:inline"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* [ date selection ] */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Bulan Sebelumnya"
          >
            <FiChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Prev</span>
          </button>

          <button
            onClick={() => setShowPicker(true)}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap"
          >
            <FiCalendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
            </span>
            <FiChevronDown className="w-3 h-3 opacity-60" />
          </button>

          <button
            onClick={handleNextMonth}
            className="p-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Bulan Berikutnya"
          >
            <span className="hidden lg:inline">Next</span>
            <FiChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* [ kalender | daftar ] [ print ] */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setViewMode('kalender')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-colors ${
                viewMode === 'kalender'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FiGrid className="w-3.5 h-3.5" />
              <span>Kalender</span>
            </button>
            <button
              onClick={() => setViewMode('daftar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-colors ${
                viewMode === 'daftar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FiList className="w-3.5 h-3.5" />
              <span>Daftar</span>
            </button>
          </div>

          <button
            onClick={() => setShowSyncModal(true)}
            className="py-1.5 px-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-500/30 transition-colors flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
            title="Sinkronkan Jadwal Saya ke Google Calendar (Feed WebCal Pribadi)"
          >
            <FiCalendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Sync Kalender</span>
          </button>

          <button
            onClick={() => window.print()}
            className="py-1.5 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
            title="Cetak Jadwal Dinas Personal (Landscape 1 Halaman)"
          >
            <FiPrinter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* 2. ON-SCREEN INTERACTIVE CONTENT (HIDDEN ON PRINT) */}
      <div className="space-y-3 sm:space-y-4 print:hidden">
        <MonthlyHoursCard
          monthlyHours={monthlyHours}
          monthName={MONTH_NAMES_ID[currentMonth - 1]}
          year={currentYear}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <FiSun className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Dinas Hari Ini
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : todayEntry ? (
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1.5 rounded-lg text-sm font-extrabold ${todayEntry.info.cellStyle}`}>
                  {getShortCode(todayEntry.code)}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {todayEntry.info.label}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {getShiftTime(todayEntry.code, staff.group)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Hari ini di luar periode {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}.
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <FiClock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Dinas Berikutnya
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : nextDuty ? (
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1.5 rounded-lg text-sm font-extrabold ${nextDuty.info.cellStyle}`}>
                  {getShortCode(nextDuty.code)}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {DAY_NAMES_ID[nextDuty.weekday]}, {nextDuty.dayNum} {MONTH_NAMES_ID[currentMonth - 1]}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {nextDuty.info.label} — {getShiftTime(nextDuty.code, staff.group)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tidak ada jadwal dinas kerja berikutnya pada bulan ini.
              </div>
            )}
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            {
              label: 'Hari Dinas Kerja',
              short: 'Hari Kerja',
              value: `${stats.workDays} hari`,
              icon: <FiBriefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
              tone: 'text-slate-900 dark:text-white'
            },
            {
              label: 'Total Jam Dinas',
              short: 'Total Jam',
              value: `${monthlyHours.totalHours} jam`,
              icon: <FiClock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
              tone: monthlyHours.isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'
            },
            {
              label: 'Shift Malam',
              short: 'Shift Malam',
              value: `${stats.nightShifts} kali`,
              icon: <FiMoon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
              tone: 'text-indigo-600 dark:text-indigo-400'
            },
            {
              label: 'Libur & Cuti/Izin',
              short: 'Libur & Izin',
              value: `${stats.offDays} / ${stats.leaveDays}`,
              icon: <FiCoffee className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
              tone: 'text-purple-600 dark:text-purple-400'
            }
          ].map(card => (
            <div
              key={card.label}
              className="p-2.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
                  <span className="hidden sm:inline">{card.label}</span>
                  <span className="sm:hidden">{card.short}</span>
                </span>
                {card.icon}
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-20 mt-1.5" />
              ) : (
                <div className={`text-base sm:text-2xl font-extrabold mt-0.5 sm:mt-1 ${card.tone}`}>
                  {card.value}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Shift Code Composition */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Komposisi Kode Shift Bulan Ini
            </h3>
            <button
              onClick={() => setShowCodeModal(true)}
              className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <FiInfo className="w-3.5 h-3.5" />
              Arti Kode
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {isLoading ? (
              <Skeleton className="h-7 w-full" />
            ) : (
              Object.entries(stats.breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => {
                  const info = getShiftInfo(code);
                  return (
                    <span
                      key={code}
                      className={`px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-bold ${info.badgeStyle}`}
                      title={`${info.label} — ${getShiftTime(code, staff.group)}`}
                    >
                      {getShortCode(code)} <span className="opacity-70">×</span> {count}
                    </span>
                  );
                })
            )}
          </div>
        </div>

        {/* Calendar or List View based on toggle */}
        {viewMode === 'kalender' ? (
          <PersonalCalendarGrid
            days={days}
            leadingBlanks={leadingBlanks}
            isLoading={isLoading}
            currentMonth={currentMonth}
            currentYear={currentYear}
          />
        ) : (
          <PersonalListView
            entries={listEntries}
            workOnly={workOnly}
            setWorkOnly={setWorkOnly}
            isLoading={isLoading}
            group={staff.group}
          />
        )}
      </div>

      {/* 3. PRINT-ONLY PORTRAIT 2-SECTION STACKED VIEW: TOP = INFO, BOTTOM = CALENDAR STYLE (STRICT 1 PAGE) */}
      <PersonalPrintLayout
        staff={staff}
        currentYear={currentYear}
        currentMonth={currentMonth}
        monthlyHours={monthlyHours}
        todayEntry={todayEntry}
        nextDuty={nextDuty}
        stats={stats}
        days={days}
        leadingBlanks={leadingBlanks}
      />

      {showPicker && (
        <MonthYearPickerModal
          currentYear={currentYear}
          currentMonth={currentMonth}
          onSelect={handleMonthChange}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showCodeModal && <ShiftCodeModal onClose={() => setShowCodeModal(false)} />}

      <CalendarSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        staffList={[staff]}
        initialStaffEmail={staff.gmail || staff.id}
      />

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 4mm 6mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
