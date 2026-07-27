'use client';

import React, { useState } from 'react';
import { i18n } from '@/lib/i18n';
import { FiCalendar, FiX, FiChevronRight } from 'react-icons/fi';

interface MonthYearPickerModalProps {
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const AVAILABLE_YEARS = [2025, 2026, 2027, 2028];

export default function MonthYearPickerModal({
  currentYear,
  currentMonth,
  onSelect,
  onClose
}: MonthYearPickerModalProps) {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const handleConfirm = () => {
    onSelect(selectedYear, selectedMonth);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Click outside to close backdrop */}
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-slide-in-right z-10 safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FiCalendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              Pilih Bulan & Tahun Jadwal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded"
            title="Tutup"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Year Selection Section */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            1. Pilih Tahun
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVAILABLE_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  selectedYear === y
                    ? 'bg-slate-200 text-slate-900 border-slate-100 shadow-md scale-105'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Month Selection Section */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            2. Pilih Bulan
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MONTH_NAMES_ID.map((name, idx) => {
              const monthNum = idx + 1;
              const isSelected = selectedMonth === monthNum;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedMonth(monthNum)}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all text-center ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md scale-105'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview Selected */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center justify-between">
          <span>Target Terpilih:</span>
          <strong className="text-slate-100 text-sm">
            {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
          </strong>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            {i18n.modalCancelBtn}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span>Tampilkan Jadwal</span>
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
