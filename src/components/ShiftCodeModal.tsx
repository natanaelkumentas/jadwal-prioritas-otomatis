'use client';

import React, { useState } from 'react';
import { i18n } from '@/lib/i18n';
import { FiInfo, FiX, FiClock, FiSearch } from 'react-icons/fi';

interface ShiftCodeModalProps {
  onClose: () => void;
}

interface ShiftCodeDefinition {
  code: string;
  badgeCode: string;
  title: string;
  cnsTime: string;
  essTime: string;
  badgeStyle: string;
  description: string;
}

export default function ShiftCodeModal({ onClose }: ShiftCodeModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const shiftDefinitions: ShiftCodeDefinition[] = [
    {
      code: 'P',
      badgeCode: 'P',
      title: 'Shift Pagi',
      cnsTime: '07:00 - 15:00 WITA',
      essTime: '07:00 - 13:00 WITA',
      badgeStyle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      description: 'Dinas operasional pagi hari untuk pemantauan fasilitas penerbangan.'
    },
    {
      code: 'S',
      badgeCode: 'S',
      title: 'Shift Siang',
      cnsTime: '12:00 - 20:00 WITA',
      essTime: '13:00 - 19:00 WITA',
      badgeStyle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description: 'Dinas operasional siang hingga malam hari.'
    },
    {
      code: 'M',
      badgeCode: 'M',
      title: 'Shift Malam',
      cnsTime: '19:00 - 07:00 WITA',
      essTime: '19:00 - 07:00 WITA',
      badgeStyle: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      description: 'Dinas operasional malam (12 jam) hingga pagi hari.'
    },
    {
      code: 'PS',
      badgeCode: 'PS',
      title: 'Shift Pagi-Siang (Long Day)',
      cnsTime: '07:00 - 19:00 WITA',
      essTime: '07:00 - 19:00 WITA',
      badgeStyle: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      description: 'Dinas jam panjang (12 jam) mengover shift pagi dan siang.'
    },
    {
      code: 'OH',
      badgeCode: 'OH / D',
      title: 'Jam Kerja Kantor / Dinas',
      cnsTime: '08:00 - 17:00 WITA',
      essTime: '08:00 - 17:00 WITA',
      badgeStyle: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      description: 'Dinas jam kantor reguler Senin hingga Jumat.'
    },
    {
      code: 'L',
      badgeCode: 'L / Y',
      title: 'Libur / Lepas Malam',
      cnsTime: 'Libur Operasional',
      essTime: 'Libur Operasional',
      badgeStyle: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
      description: 'Hari libur terjadwal atau pemulihan setelah shift malam.'
    },
    {
      code: 'CUTI',
      badgeCode: 'CUTI',
      title: 'Cuti Tahunan',
      cnsTime: 'Izin Resmi',
      essTime: 'Izin Resmi',
      badgeStyle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description: 'Cuti tahunan personel dengan persetujuan manajemen.'
    },
    {
      code: 'DINAS LUAR',
      badgeCode: 'DINAS LUAR',
      title: 'Dinas Luar Kota',
      cnsTime: 'Tugas Operasional',
      essTime: 'Tugas Operasional',
      badgeStyle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description: 'Penugasan luar kota atau kunjungan lokasi fasilitas.'
    },
    {
      code: 'DIKLAT',
      badgeCode: 'DIKLAT',
      title: 'Pelatihan / Diklat',
      cnsTime: 'Pengembangan Diri',
      essTime: 'Pengembangan Diri',
      badgeStyle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description: 'Keikutsertaan dalam kursus, sertifikasi, atau diklat kompetensi.'
    },
    {
      code: 'SAKIT',
      badgeCode: 'SAKIT',
      title: 'Izin Sakit',
      cnsTime: 'Izin Kesehatan',
      essTime: 'Izin Kesehatan',
      badgeStyle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description: 'Ketidakhadiran karena alasan kesehatan dengan surat dokter.'
    }
  ];

  const filteredDefinitions = shiftDefinitions.filter(def =>
    def.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    def.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    def.description.toLowerCase().includes(searchTerm.toLowerCase())
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
                key={def.code}
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
