'use client';

import React from 'react';
import Skeleton from '../Skeleton';
import { CalendarDayEntry } from './PersonalCalendarGrid';
import { StaffGroup, DAY_SHORT_ID, getShortCode, getShiftTime, getShiftHours } from '@/lib/shift-codes';

interface PersonalListViewProps {
  entries: CalendarDayEntry[];
  workOnly: boolean;
  setWorkOnly: (val: boolean) => void;
  isLoading: boolean;
  group: StaffGroup;
}

export default function PersonalListView({
  entries,
  workOnly,
  setWorkOnly,
  isLoading,
  group
}: PersonalListViewProps) {
  return (
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
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Tidak ada jadwal dinas yang tercatat pada periode ini.
          </div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.date}
              className={`flex items-center gap-2.5 sm:gap-4 px-3 py-2 sm:py-2.5 ${
                entry.isToday ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : ''
              }`}
            >
              <div className="w-9 sm:w-12 flex-shrink-0 text-center">
                <div className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white leading-none">
                  {entry.dayNum}
                </div>
                <div
                  className={`text-[9px] sm:text-[10px] font-bold uppercase ${
                    entry.weekday === 0
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
                  {getShiftTime(entry.code, group)}
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                {getShiftHours(entry.code, group) > 0 ? (
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                    {getShiftHours(entry.code, group)} jam
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
  );
}
