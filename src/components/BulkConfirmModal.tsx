'use client';

import React from 'react';
import { i18n } from '@/lib/i18n';
import { FiAlertTriangle, FiCheckSquare } from 'react-icons/fi';

const MAX_CONFLICTS_SHOWN = 8;

export interface ConflictEntry {
  date: string;
  names: string[];
}

interface BulkConfirmModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  selectedShiftsCount: number;
  staffCount: number;
  selectedCode: string;
  codeInfo: { label: string; badgeStyle: string };
  vacatedCount: number;
  conflicts: ConflictEntry[];
  onClose: () => void;
  onConfirm: () => void;
}

export default function BulkConfirmModal({
  isOpen,
  isSubmitting,
  selectedShiftsCount,
  staffCount,
  selectedCode,
  codeInfo,
  vacatedCount,
  conflicts,
  onClose,
  onConfirm
}: BulkConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={() => !isSubmitting && onClose()} />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 z-[101] max-h-[90vh] flex flex-col">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg flex-shrink-0 ${
              conflicts.length > 0 || vacatedCount > 0
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
            }`}
          >
            {conflicts.length > 0 || vacatedCount > 0 ? (
              <FiAlertTriangle className="w-5 h-5" />
            ) : (
              <FiCheckSquare className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {i18n.bulkConfirmTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {i18n.bulkConfirmDesc}
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-3 pr-0.5">
          {/* Summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Jumlah sel</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {selectedShiftsCount} sel · {staffCount} {i18n.bulkStaffLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Kode baru</span>
              <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${codeInfo.badgeStyle}`}>
                {selectedCode} — {codeInfo.label}
              </span>
            </div>
          </div>

          {/* Vacated work shifts notice */}
          {vacatedCount > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs leading-relaxed">
              ℹ️ <strong>{vacatedCount}</strong> {i18n.bulkVacateNotice}
            </div>
          )}

          {/* Conflict warning list */}
          {conflicts.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2">
              <div className="text-amber-700 dark:text-amber-400 font-semibold">
                ⚠️ {i18n.bulkConflictTitle}
              </div>
              <p className="text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                {i18n.bulkConflictDesc}
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {conflicts.slice(0, MAX_CONFLICTS_SHOWN).map(c => (
                  <li key={c.date} className="flex gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
                      {c.date}
                    </span>
                    <span className="truncate">{c.names.join(', ')}</span>
                  </li>
                ))}
                {conflicts.length > MAX_CONFLICTS_SHOWN && (
                  <li className="text-slate-500 dark:text-slate-400 italic">
                    +{conflicts.length - MAX_CONFLICTS_SHOWN} tanggal lainnya
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            {isSubmitting ? 'Memproses...' : i18n.btnBulkConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
