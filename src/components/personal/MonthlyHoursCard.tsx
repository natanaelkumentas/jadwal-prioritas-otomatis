'use client';

import React from 'react';
import { MonthlyHoursResult } from '@/lib/labor-rules/hours';
import { i18n } from '@/lib/i18n';
import { FiClock, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

interface MonthlyHoursCardProps {
  monthlyHours: MonthlyHoursResult;
  monthName: string;
  year: number;
}

export default function MonthlyHoursCard({ monthlyHours, monthName, year }: MonthlyHoursCardProps) {
  const { totalHours, monthlyLimit, remainingHours, excessHours, isExceeded } = monthlyHours;
  const percentage = Math.min(100, Math.round((totalHours / monthlyLimit) * 100));

  return (
    <div className="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <FiClock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {i18n.hoursCardTitle} — {monthName} {year}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              Evaluasi kepatuhan batas jam dinas (Target &lt; {monthlyLimit} jam/bulan)
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isExceeded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30 rounded-lg">
              <FiAlertTriangle className="w-3.5 h-3.5" />
              <span>{i18n.hoursStatusExcess}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg">
              <FiCheckCircle className="w-3.5 h-3.5" />
              <span>{i18n.hoursStatusNormal}</span>
            </span>
          )}
        </div>
      </div>

      {/* 3 Metric Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-4">
        {/* Metric 1: Jam Terpakai */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {i18n.hoursOccupiedLabel}
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalHours} <span className="text-xs sm:text-sm font-semibold text-slate-500">jam</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {monthlyHours.workDaysCount} hari dinas ({monthlyHours.nightShiftCount} shift malam)
          </div>
        </div>

        {/* Metric 2: Batas Ideal */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {i18n.hoursLimitLabel}
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {monthlyLimit} <span className="text-xs sm:text-sm font-semibold text-slate-500">jam</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Batas kerja standar per bulan
          </div>
        </div>

        {/* Metric 3: Sisa / Kelebihan */}
        <div
          className={`p-3 border rounded-lg ${
            isExceeded
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
              : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {isExceeded ? i18n.hoursExcessLabel : i18n.hoursRemainingLabel}
          </div>
          <div
            className={`text-lg sm:text-2xl font-black mt-1 ${
              isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isExceeded ? `+${excessHours}` : `${remainingHours}`}{' '}
            <span className="text-xs sm:text-sm font-semibold">jam</span>
          </div>
          <div
            className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${
              isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isExceeded ? i18n.hoursExcessSuffix : i18n.hoursRemainingSuffix}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          <span>{percentage}% terpakai</span>
          <span>{totalHours} / {monthlyLimit} jam</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              isExceeded
                ? 'bg-amber-500 dark:bg-amber-400'
                : percentage >= 85
                ? 'bg-amber-500 dark:bg-amber-400'
                : 'bg-emerald-500 dark:bg-emerald-400'
            }`}
            style={{ width: `${Math.min(100, (Math.min(totalHours, monthlyLimit) / monthlyLimit) * 100)}%` }}
          />
          {isExceeded && (
            <div
              className="h-full bg-rose-500 animate-pulse"
              style={{
                width: `${Math.min(100, (excessHours / monthlyLimit) * 100)}%`
              }}
              title={`Kelebihan ${excessHours} jam`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
