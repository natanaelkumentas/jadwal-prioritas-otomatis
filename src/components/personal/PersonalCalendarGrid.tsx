'use client';

import React from 'react';
import Skeleton from '../Skeleton';
import { ShiftCodeInfo, DAY_SHORT_ID, DAY_NAMES_ID, MONTH_NAMES_ID, getShortCode } from '@/lib/shift-codes';
import { Shift } from '@/lib/scheduler-engine/types';
import { FiAlertTriangle } from 'react-icons/fi';

export interface CalendarDayEntry {
  dayNum: number;
  date: string;
  weekday: number;
  shift?: Shift;
  code: string;
  info: ShiftCodeInfo;
  isToday: boolean;
  hasPendingGap: boolean;
}

interface PersonalCalendarGridProps {
  days: CalendarDayEntry[];
  leadingBlanks: number;
  isLoading: boolean;
  currentMonth: number;
  currentYear: number;
  isPrintMode?: boolean;
}

export default function PersonalCalendarGrid({
  days,
  leadingBlanks,
  isLoading,
  currentMonth,
  currentYear,
  isPrintMode = false
}: PersonalCalendarGridProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-lg ${
      isPrintMode
        ? 'p-1.5 border-slate-300 shadow-none text-slate-900'
        : 'p-2.5 sm:p-4 border-slate-200 dark:border-slate-800 shadow-sm'
    }`}>
      <div className={`grid grid-cols-7 ${isPrintMode ? 'gap-1 mb-1' : 'gap-1 sm:gap-2 mb-1.5 sm:mb-2'}`}>
        {DAY_SHORT_ID.map((dayName, idx) => (
          <div
            key={dayName}
            className={`text-center font-bold uppercase tracking-wider ${
              isPrintMode ? 'text-[7.5px] py-0.5' : 'text-[9px] sm:text-xs py-1'
            } ${
              idx === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {dayName}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${isPrintMode ? 'gap-1' : 'gap-1 sm:gap-2'}`}>
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {isLoading
          ? days.map(d => <Skeleton key={d.date} className="h-14 sm:h-20 w-full" />)
          : days.map(entry => {
              const showToday = entry.isToday && !isPrintMode;

              return (
                <div
                  key={entry.date}
                  title={`${DAY_NAMES_ID[entry.weekday]}, ${entry.dayNum} ${
                    MONTH_NAMES_ID[currentMonth - 1]
                  } ${currentYear} — ${entry.info.label}`}
                  className={`rounded border flex flex-col justify-between transition-colors ${
                    isPrintMode
                      ? 'h-9 sm:h-9.5 p-0.5 sm:p-1 border-slate-300 bg-white ring-0'
                      : `h-14 sm:h-20 p-1 sm:p-1.5 ${
                          showToday
                            ? 'border-emerald-500 dark:border-emerald-400 ring-1 ring-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                        }`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`font-bold ${
                        isPrintMode
                          ? `text-[9px] ${entry.weekday === 0 ? 'text-rose-600' : 'text-slate-800'}`
                          : `text-[10px] sm:text-xs ${
                              showToday
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : entry.weekday === 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`
                      }`}
                    >
                      {entry.dayNum}
                    </span>
                    {!isPrintMode && entry.hasPendingGap && (
                      <FiAlertTriangle
                        className="w-3 h-3 text-red-500 animate-pulse"
                        title="Menunggu penugasan teknisi pengganti"
                      />
                    )}
                  </div>

                  <div
                    className={`rounded text-center font-bold ${
                      isPrintMode
                        ? `text-[8.5px] py-0.5 leading-tight font-black ${entry.info.cellStyle}`
                        : `text-[10px] sm:text-sm py-0.5 sm:py-1.5 ${entry.info.cellStyle}`
                    }`}
                  >
                    {getShortCode(entry.code)}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
