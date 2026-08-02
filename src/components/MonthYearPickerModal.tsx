'use client';

import React, { useState, useRef, useEffect } from 'react';
import { i18n } from '@/lib/i18n';
import { FiCalendar, FiX, FiChevronRight, FiChevronDown, FiSearch, FiCheck } from 'react-icons/fi';

interface MonthYearPickerModalProps {
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

const MONTH_OPTIONS = [
  { num: 1, name: 'Januari' },
  { num: 2, name: 'Februari' },
  { num: 3, name: 'Maret' },
  { num: 4, name: 'April' },
  { num: 5, name: 'Mei' },
  { num: 6, name: 'Juni' },
  { num: 7, name: 'Juli' },
  { num: 8, name: 'Agustus' },
  { num: 9, name: 'September' },
  { num: 10, name: 'Oktober' },
  { num: 11, name: 'November' },
  { num: 12, name: 'Desember' },
];

const AVAILABLE_YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i); // 2020 - 2035

export default function MonthYearPickerModal({
  currentYear,
  currentMonth,
  onSelect,
  onClose
}: MonthYearPickerModalProps) {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Combobox Dropdown Open States
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  // Search Filter States
  const [yearQuery, setYearQuery] = useState(currentYear.toString());
  const [monthQuery, setMonthQuery] = useState(MONTH_OPTIONS[currentMonth - 1]?.name || '');

  const yearContainerRef = useRef<HTMLDivElement>(null);
  const monthContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (yearContainerRef.current && !yearContainerRef.current.contains(event.target as Node)) {
        setIsYearOpen(false);
      }
      if (monthContainerRef.current && !monthContainerRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Lists
  const filteredYears = AVAILABLE_YEARS.filter(y => y.toString().includes(yearQuery.trim()));
  const filteredMonths = MONTH_OPTIONS.filter(m => 
    m.name.toLowerCase().includes(monthQuery.toLowerCase().trim()) ||
    m.num.toString() === monthQuery.trim()
  );

  const handleConfirm = () => {
    onSelect(selectedYear, selectedMonth);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 dark:bg-slate-955/80 backdrop-blur-xs sm:backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-slide-in-right z-[101] safe-area-bottom">
        {/* Mobile touch handle indicator */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FiCalendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pilih Bulan & Tahun Jadwal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
            title="Tutup"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Year Selection Combobox */}
        <div className="relative" ref={yearContainerRef}>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            1. Pilih / Ketik Tahun
          </label>
          <div className="relative">
            <input
              type="text"
              value={yearQuery}
              onFocus={() => setIsYearOpen(true)}
              onChange={(e) => {
                setYearQuery(e.target.value);
                setIsYearOpen(true);
                const parsed = parseInt(e.target.value, 10);
                if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
                  setSelectedYear(parsed);
                }
              }}
              placeholder="Cari atau ketik tahun (misal: 2026)..."
              className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <FiSearch className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <button
              type="button"
              onClick={() => setIsYearOpen(!isYearOpen)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <FiChevronDown className={`w-4 h-4 transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Year Dropdown Scroll Menu */}
          {isYearOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 p-1 space-y-0.5">
              {filteredYears.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 text-center">Tahun tidak ditemukan</div>
              ) : (
                filteredYears.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setSelectedYear(y);
                      setYearQuery(y.toString());
                      setIsYearOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium rounded-md flex items-center justify-between transition-colors ${
                      selectedYear === y
                        ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{y}</span>
                    {selectedYear === y && <FiCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. Month Selection Combobox */}
        <div className="relative" ref={monthContainerRef}>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            2. Pilih / Ketik Bulan
          </label>
          <div className="relative">
            <input
              type="text"
              value={monthQuery}
              onFocus={() => setIsMonthOpen(true)}
              onChange={(e) => {
                setMonthQuery(e.target.value);
                setIsMonthOpen(true);
                const matchedMonth = MONTH_OPTIONS.find(m => 
                  m.name.toLowerCase() === e.target.value.toLowerCase().trim() ||
                  m.num.toString() === e.target.value.trim()
                );
                if (matchedMonth) {
                  setSelectedMonth(matchedMonth.num);
                }
              }}
              placeholder="Cari atau ketik bulan (misal: Agustus atau 8)..."
              className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <FiSearch className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <button
              type="button"
              onClick={() => setIsMonthOpen(!isMonthOpen)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <FiChevronDown className={`w-4 h-4 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Month Dropdown Scroll Menu */}
          {isMonthOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 p-1 space-y-0.5">
              {filteredMonths.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 text-center">Bulan tidak ditemukan</div>
              ) : (
                filteredMonths.map((m) => (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(m.num);
                      setMonthQuery(m.name);
                      setIsMonthOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium rounded-md flex items-center justify-between transition-colors ${
                      selectedMonth === m.num
                        ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-[11px] font-mono text-slate-400">{m.num}</span>
                      <span>{m.name}</span>
                    </div>
                    {selectedMonth === m.num && <FiCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Target Preview Badge */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Target Terpilih:</span>
          <strong className="text-slate-900 dark:text-slate-100 text-sm">
            {MONTH_OPTIONS.find(m => m.num === selectedMonth)?.name || 'Januari'} {selectedYear}
          </strong>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {i18n.modalCancelBtn}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Tampilkan Jadwal</span>
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
