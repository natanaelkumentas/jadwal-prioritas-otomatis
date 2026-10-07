'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Staff, Shift } from '@/lib/scheduler-engine/types';
import { getShortCode, MONTH_NAMES_ID } from '@/lib/shift-codes';
import MonthYearPickerModal from './MonthYearPickerModal';
import {
  FiPrinter,
  FiArrowLeft,
  FiZoomIn,
  FiZoomOut,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiChevronDown,
  FiEdit3
} from 'react-icons/fi';

interface PrintRosterViewProps {
  staffList: Staff[];
  shifts: Shift[];
  year: number;
  month: number;
}

export default function PrintRosterView({
  staffList,
  shifts,
  year,
  month
}: PrintRosterViewProps) {
  const router = useRouter();
  const [scale, setScale] = useState<number>(85);
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);

  // Customization print toggles
  const [showRatings, setShowRatings] = useState<boolean>(true);
  const [showGroupHeaders, setShowGroupHeaders] = useState<boolean>(true);
  const [showShiftTotals, setShowShiftTotals] = useState<boolean>(true);
  const [showShiftLegend, setShowShiftLegend] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showSignatureDate, setShowSignatureDate] = useState<boolean>(true);

  // Custom Signatures Fields
  const [creatorTitle, setCreatorTitle] = useState<string>('Supervisor Teknik');
  const [creatorName, setCreatorName] = useState<string>('');
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);

  const totalDays = new Date(year, month, 0).getDate();
  const daysInMonth = Array.from({ length: totalDays }, (_, i) => i + 1);
  const formattedMonthStr = month.toString().padStart(2, '0');

  const handlePrevMonth = () => {
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    router.push(`/cetak?tahun=${prevY}&bulan=${prevM}`);
  };

  const handleNextMonth = () => {
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    router.push(`/cetak?tahun=${nextY}&bulan=${nextM}`);
  };

  const handleSelectMonthYear = (newYear: number, newMonth: number) => {
    router.push(`/cetak?tahun=${newYear}&bulan=${newMonth}`);
    setShowPickerModal(false);
  };

  const getDayInitial = (day: number) => {
    const d = new Date(year, month - 1, day);
    const initials = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];
    return initials[d.getDay()];
  };

  const toDateStr = (day: number) => `${year}-${formattedMonthStr}-${day.toString().padStart(2, '0')}`;

  // Categorize staff
  const managerStaff = staffList.filter(s => s.role_level === 'Manager Teknik');
  const cnsStaff = staffList.filter(s => s.group === 'CNS' && s.role_level !== 'Manager Teknik');
  const essStaff = staffList.filter(s => s.group === 'ESS' && s.role_level !== 'Manager Teknik');

  const cnsSubGroups = Array.from(new Set(cnsStaff.map(s => s.sub_group))).sort();
  const essSubGroups = Array.from(new Set(essStaff.map(s => s.sub_group))).sort();

  const handlePrint = () => {
    window.print();
  };

  const colSpanTotal = 
    2 + 
    (showRatings ? 1 : 0) + 
    daysInMonth.length + 
    (showShiftTotals ? 4 : 0);

  const renderStaffRow = (staff: Staff, index: number) => {
    const staffShifts = shifts.filter(s => s.staff_id === (staff.id || staff.gmail));
    const counts: Record<string, number> = { P: 0, S: 0, M: 0, D: 0, L: 0 };

    daysInMonth.forEach(day => {
      const dateStr = toDateStr(day);
      const shift = staffShifts.find(s => s.date === dateStr);
      const code = shift?.shift_code || 'L';
      const short = getShortCode(code);
      counts[short] = (counts[short] || 0) + 1;
    });

    return (
      <tr key={staff.id || staff.gmail} className="border-b border-slate-300">
        <td className="p-0.5 text-center font-mono text-[9px] text-slate-800 border-r border-slate-300 w-6">
          {index}
        </td>
        <td className="p-0.5 px-1.5 text-left font-bold text-[9px] text-slate-900 border-r border-slate-300 whitespace-nowrap min-w-[130px] max-w-[155px] truncate">
          {staff.name}
        </td>

        {/* Rating Column */}
        {showRatings && (
          <td className="p-0.5 text-center font-mono text-[8px] text-slate-700 border-r border-slate-300 w-12">
            {staff.ratings && staff.ratings.length > 0 
              ? staff.ratings.join(',') 
              : '-'}
          </td>
        )}

        {/* Day Shift cells */}
        {daysInMonth.map(day => {
          const dateStr = toDateStr(day);
          const shift = staffShifts.find(s => s.date === dateStr);
          const code = shift?.shift_code || 'L';
          const short = getShortCode(code);
          const isWeekend = [0, 6].includes(new Date(year, month - 1, day).getDay());

          let bgClass = 'bg-white text-slate-900';
          if (short === 'P') bgClass = 'bg-amber-100 text-amber-950 font-bold';
          else if (short === 'S') bgClass = 'bg-emerald-100 text-emerald-950 font-bold';
          else if (short === 'M') bgClass = 'bg-indigo-100 text-indigo-950 font-bold';
          else if (short === 'D') bgClass = 'bg-blue-100 text-blue-950 font-bold';
          else if (short === 'PS') bgClass = 'bg-teal-100 text-teal-950 font-bold';
          else if (['L', 'Y'].includes(short)) bgClass = isWeekend ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600';
          else if (['C', 'DL', 'DK', 'SK'].includes(short)) bgClass = 'bg-purple-100 text-purple-950 font-bold';

          return (
            <td
              key={day}
              className={`p-0 text-center text-[8.5px] font-bold border-r border-slate-300 w-5 h-4.5 ${bgClass}`}
            >
              {short}
            </td>
          );
        })}

        {/* Duty Count Summaries */}
        {showShiftTotals && (
          <>
            <td className="p-0.5 text-center text-[8px] font-bold border-r border-slate-300 bg-amber-50 text-amber-950 w-5">
              {counts.P || 0}
            </td>
            <td className="p-0.5 text-center text-[8px] font-bold border-r border-slate-300 bg-emerald-50 text-emerald-950 w-5">
              {counts.S || 0}
            </td>
            <td className="p-0.5 text-center text-[8px] font-bold border-r border-slate-300 bg-indigo-50 text-indigo-950 w-5">
              {counts.M || 0}
            </td>
            <td className="p-0.5 text-center text-[8px] font-bold bg-slate-50 text-slate-900 w-5">
              {counts.L || 0}
            </td>
          </>
        )}
      </tr>
    );
  };

  let globalIndex = 1;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 p-2 sm:p-4 print:p-0 print:bg-white print:m-0">
      {/* Floating Toolbar for Print Customization (hidden during print) */}
      <div className="max-w-[1300px] mx-auto mb-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-3 shadow-md space-y-2.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Back & Date Selection Navigation */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors shrink-0"
              title="Kembali ke Dashboard"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            {/* Date Selection: < Prev | Month Year Picker | Next > */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
                title="Bulan Sebelumnya"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowPickerModal(true)}
                className="px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Pilih Bulan & Tahun"
              >
                <FiCalendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{MONTH_NAMES_ID[month - 1]} {year}</span>
                <FiChevronDown className="w-3 h-3 opacity-60" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
                title="Bulan Berikutnya"
              >
                <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Customization Checkbox Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <label className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRatings}
                onChange={e => setShowRatings(e.target.checked)}
                className="rounded text-emerald-600 w-3.5 h-3.5"
              />
              <span>Rating</span>
            </label>

            <label className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGroupHeaders}
                onChange={e => setShowGroupHeaders(e.target.checked)}
                className="rounded text-emerald-600 w-3.5 h-3.5"
              />
              <span>Nama Grup</span>
            </label>

            <label className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showShiftTotals}
                onChange={e => setShowShiftTotals(e.target.checked)}
                className="rounded text-emerald-600 w-3.5 h-3.5"
              />
              <span>Total Shift</span>
            </label>

            <label className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showShiftLegend}
                onChange={e => setShowShiftLegend(e.target.checked)}
                className="rounded text-emerald-600 w-3.5 h-3.5"
              />
              <span>Label Shift</span>
            </label>

            <label className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={e => setShowSignatures(e.target.checked)}
                className="rounded text-emerald-600 w-3.5 h-3.5"
              />
              <span>TTD</span>
            </label>

            {showSignatures && (
              <button
                type="button"
                onClick={() => setShowTtdConfig(prev => !prev)}
                className={`px-2 py-1 border rounded text-[11px] font-semibold flex items-center gap-1 ${
                  showTtdConfig
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Atur Jabatan & Nama Pembuat TTD"
              >
                <FiEdit3 className="w-3 h-3" />
                <span>Atur TTD</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom / Scale Adjuster */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs">
              <button
                onClick={() => setScale(prev => Math.max(65, prev - 5))}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Perkecil skala"
              >
                <FiZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold w-9 text-center text-[11px]">{scale}%</span>
              <button
                onClick={() => setScale(prev => Math.min(100, prev + 5))}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Perbesar skala"
              >
                <FiZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setScale(85)}
                className="ml-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-bold"
                title="Pas 1 Halaman Otomatis (85%)"
              >
                Auto 1 Hal
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md whitespace-nowrap"
            >
              <FiPrinter className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* Optional Expandable Signature Customization Box */}
        {showSignatures && showTtdConfig && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={showSignatureDate}
                onChange={e => setShowSignatureDate(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <span>Sertakan Tanggal (..... {MONTH_NAMES_ID[month - 1]} {year})</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 dark:text-slate-400">Jabatan:</span>
              <input
                type="text"
                value={creatorTitle}
                onChange={e => setCreatorTitle(e.target.value)}
                placeholder="Supervisor Teknik"
                className="px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-xs w-36"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 dark:text-slate-400">Nama Pembuat:</span>
              <input
                type="text"
                value={creatorName}
                onChange={e => setCreatorName(e.target.value)}
                placeholder="Kosongkan untuk garis titik"
                className="px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-xs w-48"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actual Printable Page Wrapper (Vertically Centered in Print Mode) */}
      <div className="flex justify-center print-wrapper">
        <div
          style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top center' }}
          className="bg-white text-slate-900 border border-slate-300 shadow-xl print:shadow-none print:border-none p-3.5 sm:p-4 rounded-lg w-[1240px] print:w-full print:p-0 print:transform-none transition-transform print-sheet"
        >
          {/* Header AirNav */}
          <div className="border-b-2 border-slate-900 pb-1.5 mb-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold tracking-wider text-slate-900 uppercase">
                PERUM LEMBAGA PENYELENGGARA PELAYANAN NAVIGASI PENERBANGAN INDONESIA
              </div>
              <div className="text-[12px] font-black tracking-tight text-slate-900 uppercase">
                AIRNAV INDONESIA — KANTOR CABANG MANADO (UNIT TEKNIK ATS)
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-extrabold text-slate-900 uppercase">
                JADWAL DINAS SHIFT OPERASIONAL
              </div>
              <div className="text-[10px] font-bold text-slate-700 uppercase">
                PERIODE: {MONTH_NAMES_ID[month - 1].toUpperCase()} {year}
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <table className="w-full border-collapse border border-slate-900 text-center leading-tight">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-900">
                <th className="p-0.5 text-[8.5px] font-bold border-r border-slate-900 w-6">NO</th>
                <th className="p-0.5 text-[8.5px] font-bold border-r border-slate-900 text-left px-1.5">NAMA PERSONEL</th>
                {showRatings && (
                  <th className="p-0.5 text-[8.5px] font-bold border-r border-slate-900 w-12">RATING</th>
                )}
                {daysInMonth.map(day => (
                  <th key={day} className="p-0 text-[8px] font-bold border-r border-slate-900 w-5">
                    <div>{day}</div>
                    <div className="text-[7.5px] text-slate-600">{getDayInitial(day)}</div>
                  </th>
                ))}
                {showShiftTotals && (
                  <>
                    <th className="p-0 text-[7.5px] font-bold border-r border-slate-900 bg-amber-100 text-amber-950 w-5">P</th>
                    <th className="p-0 text-[7.5px] font-bold border-r border-slate-900 bg-emerald-100 text-emerald-950 w-5">S</th>
                    <th className="p-0 text-[7.5px] font-bold border-r border-slate-900 bg-indigo-100 text-indigo-950 w-5">M</th>
                    <th className="p-0 text-[7.5px] font-bold bg-slate-200 text-slate-900 w-5">L</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* SECTION 1: Manager Teknik */}
              {managerStaff.length > 0 && (
                <>
                  {showGroupHeaders && (
                    <tr className="bg-slate-800 text-white font-bold text-[8.5px]">
                      <td colSpan={colSpanTotal} className="text-left px-2 py-0.5 tracking-wide">
                        MANAGER TEKNIK
                      </td>
                    </tr>
                  )}
                  {managerStaff.map(s => renderStaffRow(s, globalIndex++))}
                </>
              )}

              {/* SECTION 2: CNS Groups */}
              {cnsSubGroups.map(subGroup => {
                const groupStaff = cnsStaff.filter(s => s.sub_group === subGroup);
                if (groupStaff.length === 0) return null;
                const groupTitle = subGroup && subGroup !== '-' ? `GRUP TEKNIS CNS — GRUP ${subGroup}` : 'GRUP TEKNIS CNS';
                return (
                  <React.Fragment key={subGroup}>
                    {showGroupHeaders && (
                      <tr className="bg-slate-100 font-extrabold text-[8px] text-slate-800 border-t border-b border-slate-400">
                        <td colSpan={colSpanTotal} className="text-left px-2 py-0.5 tracking-wider uppercase">
                          {groupTitle}
                        </td>
                      </tr>
                    )}
                    {groupStaff.map(s => renderStaffRow(s, globalIndex++))}
                  </React.Fragment>
                );
              })}

              {/* SECTION 3: ESS Groups */}
              {essSubGroups.map(subGroup => {
                const groupStaff = essStaff.filter(s => s.sub_group === subGroup);
                if (groupStaff.length === 0) return null;
                const groupTitle = subGroup && subGroup !== '-' ? `GRUP TEKNIS ESS — GRUP ${subGroup}` : 'GRUP TEKNIS ESS';
                return (
                  <React.Fragment key={subGroup}>
                    {showGroupHeaders && (
                      <tr className="bg-slate-100 font-extrabold text-[8px] text-slate-800 border-t border-b border-slate-400">
                        <td colSpan={colSpanTotal} className="text-left px-2 py-0.5 tracking-wider uppercase">
                          {groupTitle}
                        </td>
                      </tr>
                    )}
                    {groupStaff.map(s => renderStaffRow(s, globalIndex++))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Legend and Signatures Block */}
          {(showShiftLegend || showSignatures) && (
            <div className="mt-6 sm:mt-8 pt-3 border-t-2 border-slate-400 flex items-start justify-between text-[8.5px] leading-tight print:mt-8">
              {/* Shift Codes Legend: CNS vs ESS hours clearly separated */}
              {showShiftLegend ? (
                <div>
                  <div className="font-bold text-[8.5px] mb-0.5">KETERANGAN KODE DINAS:</div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5 text-[8px] text-slate-700">
                    <div><strong>P</strong> : Pagi (CNS: 07:00-15:00 | ESS: 07:00-13:00 WITA)</div>
                    <div><strong>S</strong> : Siang (CNS: 12:00-20:00 | ESS: 13:00-19:00 WITA)</div>
                    <div><strong>M</strong> : Malam (19:00 - 07:00 WITA)</div>
                    <div><strong>PS</strong> : Pagi-Siang / Long Day (07:00 - 19:00 WITA)</div>
                    <div><strong>D / OH</strong> : Dinas Kantor (08:00 - 17:00 WITA)</div>
                    <div><strong>L / Y</strong> : Libur Rutin / Lepas Malam</div>
                    <div className="col-span-2"><strong>C / DL / DK / SK</strong> : Cuti / Dinas Luar / Diklat / Izin Sakit</div>
                  </div>
                </div>
              ) : <div />}

              {/* Signature Block with Date on Top */}
              {showSignatures && (
                <div className="flex flex-col items-end">
                  {showSignatureDate && (
                    <div className="text-[8.5px] font-semibold text-slate-800 mb-1 pr-6">
                      Manado, ..... {MONTH_NAMES_ID[month - 1]} {year}
                    </div>
                  )}
                  <div className="flex gap-12 text-center text-[8.5px]">
                    <div>
                      <div className="text-slate-600">Dibuat Oleh:</div>
                      <div className="font-bold mt-0.5">{creatorTitle || 'Supervisor Teknik'}</div>
                      <div className="h-14"></div>
                      <div className="font-bold border-b border-slate-900 inline-block px-4">
                        {creatorName.trim() ? creatorName : '( .................................................. )'}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-600">Mengetahui / Menyetujui:</div>
                      <div className="font-bold mt-0.5">Manager Teknik</div>
                      <div className="h-14"></div>
                      <div className="font-bold border-b border-slate-900 inline-block px-4">
                        {managerStaff[0]?.name || '( .................................................. )'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Month Year Direct Jump Modal */}
      {showPickerModal && (
        <MonthYearPickerModal
          currentYear={year}
          currentMonth={month}
          onSelect={handleSelectMonthYear}
          onClose={() => setShowPickerModal(false)}
        />
      )}

      {/* Global CSS for Print Fitting and Vertical Centering */}
      <style jsx global>{`
        @page {
          size: landscape;
          margin: 4mm 6mm;
        }
        @media print {
          html, body {
            height: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-wrapper {
            width: 100% !important;
            min-height: 100vh !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            box-sizing: border-box !important;
            margin: auto 0 !important;
            page-break-inside: avoid !important;
          }
          .print-sheet {
            width: 100% !important;
            margin: auto 0 !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
