'use client';

import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import Skeleton from './Skeleton';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/components/ToastProvider';
import { generateMonthlyRoster } from '@/app/actions/generator';
import MonthYearPickerModal from './MonthYearPickerModal';
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiChevronDown,
  FiPlus,
  FiLoader,
  FiX
} from 'react-icons/fi';

interface MonthSelectorProps {
  currentYear: number;
  currentMonth: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
  onRefreshData?: () => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MonthSelector({
  currentYear,
  currentMonth,
  onMonthChange,
  onRefreshData
}: MonthSelectorProps) {
  const { isThemeChanging } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(currentYear - 1, 12);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(currentYear + 1, 1);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  const handleConfirmGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateMonthlyRoster({
        year: currentYear,
        month: currentMonth
      });

      if (res.success) {
        toast.success(`Berhasil membuat ${res.totalShifts} shift untuk bulan ${MONTH_NAMES_ID[currentMonth - 1]} ${currentYear}.`);
        setShowModal(false);
        onRefreshData?.();
      } else {
        if (res.error?.includes('sudah tersedia')) {
          toast.info(res.error);
          setShowModal(false);
          onRefreshData?.();
        } else {
          toast.error(res.error || 'Gagal membuat jadwal.');
        }
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memproses pembuatan jadwal: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTodayMonth = () => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
  };

  const isCurrentMonthNow = () => {
    const now = new Date();
    return currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1);
  };

  return (
    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
      {/* Month Navigation Controls */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
        {/* Icon-only Prev Month button */}
        <button
          onClick={handlePrevMonth}
          className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
          title="Bulan Sebelumnya"
          aria-label="Bulan Sebelumnya"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span className="hidden md:inline">Bulan Sebelumnya</span>
        </button>

        {/* Clickable Month & Year Display */}
        <button
          onClick={() => setShowPickerModal(true)}
          className="text-center sm:px-4 min-w-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer group flex-1 sm:flex-initial"
          title="Klik untuk memilih bulan & tahun secara langsung"
        >
          <span className="text-[9px] sm:text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
            <FiCalendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{i18n.monthSelectLabel}</span>
            <FiChevronDown className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
            {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
          </span>
        </button>

        {/* Icon-only Next Month button */}
        <button
          onClick={handleNextMonth}
          className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
          title="Bulan Berikutnya"
          aria-label="Bulan Berikutnya"
        >
          <span className="hidden md:inline">Bulan Berikutnya</span>
          <FiChevronRight className="w-4 h-4" />
        </button>

        {/* Today / Current Month Quick Jump Button */}
        {!isCurrentMonthNow() && (
          <button
            onClick={handleTodayMonth}
            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            title="Kembali ke Bulan Ini"
          >
            <span>Bulan Ini</span>
          </button>
        )}
      </div>

      {/* Auto-Generate Button */}
      <button
        onClick={() => setShowModal(true)}
        className="py-2 px-3 sm:px-4 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
      >
        <FiPlus className="w-4 h-4" />
        <span>Buat Jadwal</span>
      </button>

      {/* Direct Month & Year Picker Modal Popup */}
      {showPickerModal && (
        <MonthYearPickerModal
          currentYear={currentYear}
          currentMonth={currentMonth}
          onSelect={(year, month) => {
            onMonthChange(year, month);
          }}
          onClose={() => setShowPickerModal(false)}
        />
      )}

      {/* Generator Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-t-xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 safe-area-bottom">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {i18n.modalGenerateTitle}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
                title="Tutup"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {i18n.modalGenerateDesc}
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
              Target Bulan: <strong className="text-slate-200">{MONTH_NAMES_ID[currentMonth - 1]} {currentYear}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                {i18n.modalCancelBtn}
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : null}
                <span>{isGenerating ? i18n.generatingStatus : i18n.modalConfirmBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
