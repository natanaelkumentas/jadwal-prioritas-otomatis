'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { getStaffMonthlySchedule } from '@/app/actions/scheduler';
import { supabaseClient } from '@/lib/supabase';
import Skeleton from './Skeleton';
import MonthYearPickerModal from './MonthYearPickerModal';
import ShiftCodeModal from './ShiftCodeModal';
import {
  getShiftInfo,
  getShortCode,
  getShiftTime,
  getShiftHours,
  DAY_NAMES_ID,
  DAY_SHORT_ID,
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
  FiAlertTriangle
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

  // Real-time listener so the technician sees roster changes without reloading
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

  const isCurrentMonthNow =
    currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;

  // Build one entry per calendar day of the selected month
  const days = useMemo(() => {
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

  // Monthly duty statistics
  const stats = useMemo(() => {
    const breakdown: Record<string, number> = {};
    let workDays = 0;
    let offDays = 0;
    let leaveDays = 0;
    let totalHours = 0;
    let nightShifts = 0;

    days.forEach(({ code, info }) => {
      const normalized = code.toUpperCase();
      breakdown[normalized] = (breakdown[normalized] || 0) + 1;

      if (info.category === 'work') {
        workDays += 1;
        totalHours += getShiftHours(code, staff.group);
        if (normalized === 'M') nightShifts += 1;
      } else if (info.category === 'leave') {
        leaveDays += 1;
      } else {
        offDays += 1;
      }
    });

    return { breakdown, workDays, offDays, leaveDays, totalHours, nightShifts };
  }, [days, staff.group]);

  const todayEntry = days.find(d => d.isToday);
  const nextDuty = days.find(d => d.date > todayStr && d.info.category === 'work');
  const listEntries = workOnly ? days.filter(d => d.info.category !== 'off') : days;

  // Leading blank cells so the 1st lands under the correct weekday column
  const leadingBlanks = days.length > 0 ? days[0].weekday : 0;

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Month Navigation & View Controls */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm print:hidden">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <FiChevronLeft className="w-4 h-4" />
            <span className="hidden md:inline">Sebelumnya</span>
          </button>

          <button
            onClick={() => setShowPicker(true)}
            className="text-center sm:px-4 min-w-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer group flex-1 sm:flex-initial"
            title="Klik untuk memilih bulan & tahun"
          >
            <span className="text-[9px] sm:text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <FiCalendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Periode Jadwal</span>
              <FiChevronDown className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
              {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
            </span>
          </button>

          <button
            onClick={handleNextMonth}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <span className="hidden md:inline">Berikutnya</span>
            <FiChevronRight className="w-4 h-4" />
          </button>

          {!isCurrentMonthNow && (
            <button
              onClick={() => handleMonthChange(today.getFullYear(), today.getMonth() + 1)}
              className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-bold transition-all"
              title="Kembali ke Bulan Ini"
            >
              Bulan Ini
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar / List view switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 flex-1 sm:flex-initial">
            <button
              onClick={() => setViewMode('kalender')}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${viewMode === 'kalender'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <FiGrid className="w-3.5 h-3.5" />
              <span>Kalender</span>
            </button>
            <button
              onClick={() => setViewMode('daftar')}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${viewMode === 'daftar'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <FiList className="w-3.5 h-3.5" />
              <span>Daftar</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            title="Cetak Jadwal Dinas"
            aria-label="Cetak Jadwal Dinas"
          >
            <FiPrinter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Today & Next Duty Highlight */}
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
              Hari ini di luar periode {MONTH_NAMES_ID[currentMonth - 1]} {currentYear} yang sedang ditampilkan.
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

      {/* Monthly Statistics */}
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
            value: `${stats.totalHours} jam`,
            icon: <FiClock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
            tone: 'text-sky-600 dark:text-sky-400'
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
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Komposisi Kode Shift Bulan Ini
          </h3>
          <button
            onClick={() => setShowCodeModal(true)}
            className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 print:hidden"
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

      {/* Calendar View */}
      {viewMode === 'kalender' && (
        <div className="p-2.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2">
            {DAY_SHORT_ID.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-center text-[9px] sm:text-xs font-bold uppercase tracking-wider py-1 ${idx === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                  }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {isLoading
              ? days.map(d => <Skeleton key={d.date} className="h-14 sm:h-20 w-full" />)
              : days.map(entry => (
                <div
                  key={entry.date}
                  title={`${DAY_NAMES_ID[entry.weekday]}, ${entry.dayNum} ${MONTH_NAMES_ID[currentMonth - 1]} ${currentYear} — ${entry.info.label}`}
                  className={`h-14 sm:h-20 rounded-lg border p-1 sm:p-1.5 flex flex-col justify-between transition-colors ${entry.isToday
                      ? 'border-emerald-500 dark:border-emerald-400 ring-1 ring-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-[10px] sm:text-xs font-bold ${entry.isToday
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : entry.weekday === 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                    >
                      {entry.dayNum}
                    </span>
                    {entry.hasPendingGap && (
                      <FiAlertTriangle
                        className="w-3 h-3 text-red-500 animate-pulse"
                        title="Menunggu penugasan teknisi pengganti"
                      />
                    )}
                  </div>

                  <div
                    className={`rounded text-center text-[10px] sm:text-sm py-0.5 sm:py-1.5 font-bold ${entry.info.cellStyle}`}
                  >
                    {getShortCode(entry.code)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detail List View */}
      {viewMode === 'daftar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Rincian Jadwal Dinas
            </h3>
            <label className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer print:hidden">
              <input
                type="checkbox"
                checked={workOnly}
                onChange={e => setWorkOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-600"
              />
              Sembunyikan hari libur
            </label>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : listEntries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Tidak ada jadwal dinas yang tercatat pada periode ini.
              </div>
            ) : (
              listEntries.map(entry => (
                <div
                  key={entry.date}
                  className={`flex items-center gap-2.5 sm:gap-4 px-3 py-2 sm:py-2.5 ${entry.isToday ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : ''
                    }`}
                >
                  <div className="w-9 sm:w-12 flex-shrink-0 text-center">
                    <div className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white leading-none">
                      {entry.dayNum}
                    </div>
                    <div
                      className={`text-[9px] sm:text-[10px] font-bold uppercase ${entry.weekday === 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                      {DAY_SHORT_ID[entry.weekday]}
                    </div>
                  </div>

                  <span
                    className={`w-10 sm:w-12 flex-shrink-0 text-center py-1 rounded text-[10px] sm:text-xs font-extrabold ${entry.info.cellStyle}`}
                  >
                    {getShortCode(entry.code)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {entry.info.label}
                      {entry.isToday && (
                        <span className="ml-1.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
                      {getShiftTime(entry.code, staff.group)}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {getShiftHours(entry.code, staff.group) > 0 ? (
                      <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                        {getShiftHours(entry.code, staff.group)} jam
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-600">—</span>
                    )}
                    {entry.hasPendingGap && (
                      <div className="text-[9px] font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        Menunggu pengganti
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showPicker && (
        <MonthYearPickerModal
          currentYear={currentYear}
          currentMonth={currentMonth}
          onSelect={handleMonthChange}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showCodeModal && <ShiftCodeModal onClose={() => setShowCodeModal(false)} />}
    </div>
  );
}
