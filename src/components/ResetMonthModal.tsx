'use client';

import React, { useState } from 'react';
import { FiAlertTriangle, FiX, FiRefreshCw, FiTrash2, FiCalendar } from 'react-icons/fi';

interface ResetMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'libur' | 'delete') => Promise<void>;
  monthName: string;
  year: number;
  isSubmitting?: boolean;
}

export default function ResetMonthModal({
  isOpen,
  onClose,
  onConfirm,
  monthName,
  year,
  isSubmitting = false
}: ResetMonthModalProps) {
  const [resetMode, setResetMode] = useState<'libur' | 'delete'>('libur');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-rose-50/80 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reset-modal-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Reset Jadwal Bulanan
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {monthName} {year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Batal"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Options */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
            Tindakan ini akan mereset jadwal dinas seluruh teknisi untuk periode{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{monthName} {year}</strong>. 
            Silakan pilih metode reset yang diinginkan:
          </p>

          <div className="space-y-2.5">
            {/* Option 1: Set all to Libur (L) */}
            <label
              onClick={() => setResetMode('libur')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                resetMode === 'libur'
                  ? 'border-rose-500 dark:border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 ring-1 ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="resetMode"
                value="libur"
                checked={resetMode === 'libur'}
                onChange={() => setResetMode('libur')}
                className="mt-0.5 text-rose-600 focus:ring-rose-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <FiCalendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>Ubah Semua Shift Menjadi Libur (L)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Seluruh shift yang ada akan diubah menjadi kode <strong>L (Libur)</strong>. Shift tetap tersimpan di database dan siap diedit manual.
                </p>
              </div>
            </label>

            {/* Option 2: Delete all shifts (Empty total) */}
            <label
              onClick={() => setResetMode('delete')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                resetMode === 'delete'
                  ? 'border-rose-500 dark:border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 ring-1 ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="resetMode"
                value="delete"
                checked={resetMode === 'delete'}
                onChange={() => setResetMode('delete')}
                className="mt-0.5 text-rose-600 focus:ring-rose-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <FiTrash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Kosongkan Total (Hapus Shift)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Menghapus seluruh catatan shift bulan ini sehingga jadwal kosong dan tombol <strong>Buat Jadwal</strong> otomatis dapat dijalankan kembali.
                </p>
              </div>
            </label>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <FiAlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>Semua riwayat gap event pending pada bulan ini juga akan dibersihkan otomatis.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(resetMode)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mereset...</span>
              </>
            ) : (
              <>
                <FiTrash2 className="w-3.5 h-3.5" />
                <span>Konfirmasi Reset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
