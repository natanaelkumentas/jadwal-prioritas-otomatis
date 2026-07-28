'use client';

import React, { useState } from 'react';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { i18n } from '@/lib/i18n';
import { FiSearch, FiAlertTriangle } from 'react-icons/fi';

interface RosterGridProps {
  initialStaff: Staff[];
  shifts: Shift[];
  gapEvents: GapEvent[];
  currentYear?: number;
  currentMonth?: number;
  onSelectGap: (gapEvent: GapEvent, shift: Shift) => void;
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
      return 'bg-red-500/10 text-red-500 border border-red-500 animate-pulse font-bold hover:bg-red-500/20 cursor-pointer shadow-sm shadow-red-500/20';
    }

    if (!shift) {
      return 'bg-slate-800/20 text-slate-500 border border-slate-700/50';
    }

    const code = shift.shift_code.toUpperCase();
    
    switch (code) {
      case 'P':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20';
      case 'S':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20';
      case 'M':
        return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20 font-bold';
      case 'PS':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20';
      case 'OH':
      case 'D':
        return 'bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20';
      case 'CUTI':
      case 'DINAS LUAR':
      case 'DIKLAT':
      case 'SAKIT':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 font-semibold';
      case 'L':
      case 'Y':
      default:
        return 'bg-slate-800/10 text-slate-400 border border-slate-700/20 hover:bg-slate-800/20';
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
      <div key={key} className="mb-6 sm:mb-8">
        <h3 className="text-sm sm:text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-3 sm:mb-4 truncate">
          {title}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50 shadow-md">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/90 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-slate-300 w-28 sm:w-56 md:w-64 border-r border-slate-800 sticky left-0 bg-slate-950 z-20 text-[10px] sm:text-sm">
                  {i18n.tableColName}
                </th>
                {daysInMonth.map(day => (
                  <th key={day} scope="col" className="px-0.5 sm:px-1 py-1.5 sm:py-2 text-center text-[11px] sm:text-xs font-semibold text-slate-400 w-7 sm:w-10">
                    <div>{day}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase">{getDayLabel(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {staffGroup.map(staff => {
                return (
                  <tr key={staff.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-2 sm:px-4 py-1.5 sm:py-3 border-r border-slate-800 sticky left-0 bg-slate-955/95 z-10 w-32 sm:w-56 md:w-64 shadow-md">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 truncate max-w-[105px] sm:max-w-[160px] md:max-w-[180px] text-[10px] sm:text-sm">
                          {staff.name}
                        </span>
                        {/* Ratings & Subgroup Pills */}
                        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                          {staff.ratings?.map(r => (
                            <span 
                              key={r} 
                              className="px-1 py-0.2 sm:py-0.5 text-[8px] sm:text-[10px] font-mono font-bold bg-slate-800/80 border border-slate-700 text-slate-300 sm:text-slate-400 rounded"
                            >
                              {r}
                            </span>
                          ))}
                          <span className="hidden sm:inline-block px-1 py-0.5 text-[9px] bg-slate-900 border border-slate-800 text-slate-500 rounded truncate max-w-[80px]">
                            {staff.sub_group}
                          </span>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map(day => {
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
                        <td key={day} className="p-0.5 text-center border-r border-slate-850">
                          <button
                            title={`${staff.name} - ${dateStr}: ${rawCode}`}
                            onClick={() => {
                              if (pendingGap && shift) {
                                onSelectGap(pendingGap, shift);
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
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 text-xs sm:text-sm transition-colors"
          />
          <FiSearch className="absolute left-3 top-3 text-slate-500 w-3.5 h-3.5" />
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-400">
          <span className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> <span className="hidden sm:inline">{i18n.legendMorning}</span><span className="sm:hidden">P</span>
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> <span className="hidden sm:inline">{i18n.legendAfternoon}</span><span className="sm:hidden">S</span>
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> <span className="hidden sm:inline">{i18n.legendNight}</span><span className="sm:hidden">M</span>
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> <span className="hidden sm:inline">{i18n.legendLongDay}</span><span className="sm:hidden">PS</span>
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> <span className="hidden sm:inline">{i18n.legendGap}</span><span className="sm:hidden">GAP</span>
          </span>
        </div>
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
    </div>
  );
}
