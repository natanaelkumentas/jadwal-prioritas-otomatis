'use client';

import React, { useState } from 'react';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { i18n } from '@/lib/i18n';
import { FiSearch, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import ShiftCodeModal from './ShiftCodeModal';

interface RosterGridProps {
  initialStaff: Staff[];
  shifts: Shift[];
  gapEvents: GapEvent[];
  currentYear?: number;
  currentMonth?: number;
  onSelectGap: (gapEvent: GapEvent, shift: Shift, staff?: Staff) => void;
  onSelectShift: (shift: Shift, staff: Staff) => void;
}

export default function RosterGrid({
  initialStaff,
  shifts,
  gapEvents,
  currentYear = 2026,
  currentMonth = 7,
  onSelectGap,
  onSelectShift
}: RosterGridProps) {
  const [staffList] = useState<Staff[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShiftCodeModal, setShowShiftCodeModal] = useState(false);

  // Today's date calculations for highlighting
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const isCurrentCalendarMonth = currentYear === todayYear && currentMonth === todayMonth;

  // Filter staff by search term
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate Manager Teknik from technician groups to render at top
  const cnsStaff = filteredStaff.filter(s => s.group === 'CNS');
  const essStaff = filteredStaff.filter(s => s.group === 'ESS');

  const managerStaff = filteredStaff.filter(s => s.role_level === 'Manager Teknik');
  const nonManagerCNS = cnsStaff.filter(s => s.role_level !== 'Manager Teknik');

  // Group CNS and ESS by sub-group
  const cnsSubGroups = Array.from(new Set(nonManagerCNS.map(s => s.sub_group))).sort();
  const essSubGroups = Array.from(new Set(essStaff.map(s => s.sub_group))).sort();

  // Helper to render shift cell style
  const getShiftStyle = (shift: Shift | undefined, hasPendingGap: GapEvent | undefined) => {
    if (hasPendingGap) {
      // Red pulsing indicator for active gap events
      return 'bg-red-100 dark:bg-red-500/25 text-red-900 dark:text-red-200 border-2 border-red-500 animate-pulse font-extrabold hover:bg-red-200 shadow-xs shadow-red-500/30';
    }

    if (!shift) {
      return 'bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50';
    }

    const code = shift.shift_code.toUpperCase();
    
    switch (code) {
      case 'P':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-500/40 hover:bg-amber-200 font-bold';
      case 'S':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-500/40 hover:bg-emerald-200 font-bold';
      case 'M':
        return 'bg-indigo-100 dark:bg-indigo-500/25 text-indigo-950 dark:text-indigo-300 border border-indigo-400 dark:border-indigo-500/40 hover:bg-indigo-200 font-extrabold';
      case 'PS':
        return 'bg-rose-100 dark:bg-rose-500/20 text-rose-950 dark:text-rose-300 border border-rose-400 dark:border-rose-500/40 hover:bg-rose-200 font-bold';
      case 'OH':
      case 'D':
        return 'bg-sky-100 dark:bg-sky-500/20 text-sky-950 dark:text-sky-300 border border-sky-400 dark:border-sky-500/40 hover:bg-sky-200 font-bold';
      case 'CUTI':
      case 'DINAS LUAR':
      case 'DIKLAT':
      case 'SAKIT':
        return 'bg-purple-100 dark:bg-purple-500/20 text-purple-950 dark:text-purple-300 border border-purple-400 dark:border-purple-500/40 hover:bg-purple-200 font-bold';
      case 'L':
      case 'Y':
      default:
        return 'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 font-medium';
    }
  };

  // Calculate days in the target month (e.g., 30, 31, 28)
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInMonth = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  const formattedMonthStr = currentMonth.toString().padStart(2, '0');

  // Helper to get Indonesian day initial (M, S, S, R, K, J, S)
  const getDayLabel = (dayNum: number) => {
    const dateObj = new Date(currentYear, currentMonth - 1, dayNum);
    const dayInitialsId = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu
    return dayInitialsId[dateObj.getDay()];
  };

  const renderSection = (title: string, staffGroup: Staff[], key: string) => {
    if (staffGroup.length === 0) return null;

    return (
      <div key={key} className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1.5 mb-2 sm:mb-4">
          <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
            {title}
          </h3>
          <span className="text-[9px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 flex-shrink-0">
            {staffGroup.length} Personel
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-100 dark:bg-slate-950 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left font-bold text-slate-900 dark:text-white w-28 sm:w-56 md:w-64 border-r border-slate-300 dark:border-slate-800 sticky left-0 bg-slate-100 dark:bg-slate-950 z-20 text-[10px] sm:text-sm">
                  {i18n.tableColName}
                </th>
                {daysInMonth.map(day => {
                  const isToday = isCurrentCalendarMonth && day === todayDay;
                  return (
                    <th 
                      key={day} 
                      scope="col" 
                      className={`px-0.5 sm:px-1 py-1.5 sm:py-2 text-center text-[11px] sm:text-xs font-bold w-7 sm:w-10 transition-colors ${
                        isToday
                          ? 'bg-emerald-100 text-emerald-950 font-black border-b-2 border-emerald-600 dark:bg-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span>{day}</span>
                        <span className="text-[9px] sm:text-[10px] uppercase opacity-80">{getDayLabel(day)}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {staffGroup.map(staff => {
                return (
                  <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-2 sm:px-4 py-1.5 sm:py-3 border-r border-slate-300 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-950 z-10 w-32 sm:w-56 md:w-64 shadow-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[92px] sm:max-w-[160px] md:max-w-[180px] text-[10px] sm:text-sm">
                          {staff.name}
                        </span>
                        {/* Ratings & Subgroup Pills */}
                        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                          {staff.ratings?.map(r => (
                            <span 
                              key={r} 
                              className="px-1 py-0.2 sm:py-0.5 text-[8px] sm:text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded"
                            >
                              {r}
                            </span>
                          ))}
                          <span className="hidden sm:inline-block px-1 py-0.5 text-[9px] font-medium bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 rounded truncate max-w-[80px]">
                            {staff.sub_group}
                          </span>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const isToday = isCurrentCalendarMonth && day === todayDay;
                      const dateStr = `${currentYear}-${formattedMonthStr}-${day.toString().padStart(2, '0')}`;
                      const shift = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
                      const pendingGap = gapEvents.find(g => g.shift_id === shift?.id && g.status === 'Pending');

                      const rawCode = shift?.shift_code || 'L';
                      let displayCode = rawCode;
                      if (rawCode === 'CUTI') displayCode = 'CT';
                      else if (rawCode === 'DINAS LUAR') displayCode = 'DL';
                      else if (rawCode === 'DIKLAT') displayCode = 'DK';
                      else if (rawCode === 'SAKIT') displayCode = 'SK';

                      return (
                        <td key={day} className={`p-0.5 text-center border-r border-slate-200 dark:border-slate-800 ${isToday ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : ''}`}>
                          <button
                            title={`${staff.name} - ${dateStr}: ${rawCode}`}
                            onClick={() => {
                              if (pendingGap && shift) {
                                onSelectGap(pendingGap, shift, staff);
                              } else if (shift) {
                                onSelectShift(shift, staff);
                              }
                            }}
                            className={`w-7 h-7 sm:w-9 sm:h-9 text-[9px] sm:text-xs rounded transition-all flex items-center justify-center ${getShiftStyle(shift, pendingGap)}`}
                          >
                            {displayCode}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Search and Shift Legend Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={i18n.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-500 text-xs sm:text-sm transition-colors shadow-xs"
          />
          <FiSearch className="absolute left-3 top-3 text-slate-400 dark:text-slate-500 w-3.5 h-3.5" />
        </div>

        <button
          onClick={() => setShowShiftCodeModal(true)}
          className="py-1.5 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs group whitespace-nowrap self-start sm:self-auto"
        >
          <FiInfo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Kode Shift</span>
        </button>
      </div>

      {/* Top Row Section: Management / Manager Teknik */}
      {renderSection(i18n.sectionManagement, managerStaff, 'management-section')}

      {/* CNS Technical Subgroups */}
      {cnsSubGroups.map(subGroup => {
        const staffInSubGroup = nonManagerCNS.filter(s => s.sub_group === subGroup);
        return renderSection(`${i18n.sectionCNSGroup} - ${subGroup}`, staffInSubGroup, subGroup);
      })}

      {/* ESS Technical Subgroups */}
      {essSubGroups.map(subGroup => {
        const staffInSubGroup = essStaff.filter(s => s.sub_group === subGroup);
        return renderSection(`${i18n.sectionESSGroup} - ${subGroup}`, staffInSubGroup, subGroup);
      })}

      {/* Interactive Shift Code Reference Modal */}
      {showShiftCodeModal && (
        <ShiftCodeModal onClose={() => setShowShiftCodeModal(false)} />
      )}
    </div>
  );
}
