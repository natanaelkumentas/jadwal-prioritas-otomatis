'use client';

import React, { useState } from 'react';
import { i18n } from '@/lib/i18n';
import { SHIFT_REFERENCE } from '@/lib/shift-codes';
import { FiInfo, FiX, FiClock, FiSearch } from 'react-icons/fi';

interface ShiftCodeModalProps {
  onClose: () => void;
}

export default function ShiftCodeModal({ onClose }: ShiftCodeModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const query = searchTerm.toLowerCase();
  const filteredDefinitions = SHIFT_REFERENCE.filter(def =>
    def.badgeCode.toLowerCase().includes(query) ||
    def.title.toLowerCase().includes(query) ||
    def.description.toLowerCase().includes(query)
  );

  return (
    <div className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/80 backdrop-blur-xs sm:backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] animate-slide-in-right z-10 safe-area-bottom">
        {/* Mobile touch handle indicator */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <FiInfo className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Kamus & Deskripsi Kode Shift (Shift Code Reference)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Informasi lengkap jam kerja operasional Unit CNS & Unit ESS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Tutup"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Cari kode shift, nama, atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <FiSearch className="absolute left-2.5 top-2 text-slate-400 w-3.5 h-3.5" />
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
          {filteredDefinitions.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Tidak ada kode shift yang cocok dengan &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filteredDefinitions.map(def => (
              <div
                key={def.key}
                className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`px-2 py-1 text-xs font-bold rounded border font-mono whitespace-nowrap min-w-[56px] text-center ${def.badgeStyle}`}>
                    {def.badgeCode}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">{def.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{def.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 self-start sm:self-auto whitespace-nowrap">
                  <FiClock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span>CNS: <strong className="text-slate-900 dark:text-slate-200">{def.cnsTime}</strong></span>
                    <span>ESS: <strong className="text-slate-900 dark:text-slate-200">{def.essTime}</strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
