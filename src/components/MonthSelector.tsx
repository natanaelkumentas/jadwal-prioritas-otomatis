'use client';

import React, { useState } from 'react';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/components/ToastProvider';
import { generateMonthlyRoster } from '@/app/actions/generator';

interface MonthSelectorProps {
  currentYear: number;
  currentMonth: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
  onRefreshData: () => void;
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
  const [showModal, setShowModal] = useState(false);
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
        onRefreshData();
      } else {
        if (res.error?.includes('sudah tersedia')) {
          toast.info(res.error);
          setShowModal(false);
          onRefreshData();
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

  return (
    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-sm">
      {/* Month Navigation Controls */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
        <button
          onClick={handlePrevMonth}
          className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-700 transition-colors flex items-center gap-1"
        >
          <span>◄</span>
          <span className="hidden sm:inline">Bulan Sebelumnya</span>
        </button>

        <div className="text-center sm:px-3 min-w-0">
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider block">
            {i18n.monthSelectLabel}
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-100">
            {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
          </span>
        </div>

        <button
          onClick={handleNextMonth}
          className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-700 transition-colors flex items-center gap-1"
        >
          <span className="hidden sm:inline">Bulan Berikutnya</span>
          <span>►</span>
        </button>
      </div>

      {/* Auto-Generate Button */}
      <button
        onClick={() => setShowModal(true)}
        className="py-2 px-3 sm:px-4 bg-slate-200 hover:bg-slate-100 text-slate-900 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm"
      >
        <span>➕</span>
        <span className="hidden sm:inline">{i18n.btnGenerateNextMonth} ({MONTH_NAMES_ID[currentMonth - 1]} {currentYear})</span>
        <span className="sm:hidden">Buat Jadwal</span>
      </button>

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
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
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
                  <span className="animate-spin">🔄</span>
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
