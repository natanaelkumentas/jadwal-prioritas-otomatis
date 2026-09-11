'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { i18n } from '@/lib/i18n';
import { getShiftInfo, getShortCode } from '@/lib/shift-codes';
import { FiSearch, FiAlertTriangle, FiInfo, FiExternalLink, FiCheckSquare, FiSquare, FiMinusSquare } from 'react-icons/fi';
import ShiftCodeModal from './ShiftCodeModal';

interface RosterGridProps {
  initialStaff: Staff[];
  shifts: Shift[];
  gapEvents: GapEvent[];
  currentYear?: number;
  currentMonth?: number;
  onSelectGap: (gapEvent: GapEvent, shift: Shift, staff?: Staff) => void;
  onSelectShift: (shift: Shift, staff: Staff) => void;
  // Multi-select mode: cells toggle into a selection instead of opening the edit drawer
  selectionMode?: boolean;
  selectedShiftIds?: Set<string>;
  onToggleSelectionMode?: () => void;
  onSelectionChange?: (next: Set<string>) => void;
}

const EMPTY_SELECTION = new Set<string>();

export default function RosterGrid({
  initialStaff,
  shifts,
  gapEvents,
  currentYear = 2026,
  currentMonth = 7,
  onSelectGap,
  onSelectShift,
  selectionMode = false,
  selectedShiftIds = EMPTY_SELECTION,
  onToggleSelectionMode,
  onSelectionChange
}: RosterGridProps) {
  const [staffList] = useState<Staff[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShiftCodeModal, setShowShiftCodeModal] = useState(false);

  // Last cell clicked in selection mode; Shift+click extends from here along the same row
  const [selectionAnchor, setSelectionAnchor] = useState<{ staffId: string; day: number } | null>(null);

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

    return getShiftInfo(shift.shift_code).cellStyle;
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

  const toDateStr = (day: number) => `${currentYear}-${formattedMonthStr}-${day.toString().padStart(2, '0')}`;

  // All shift rows of one staff member in the displayed month (used by row select & range select)
  const getRowShifts = (staff: Staff) =>
    shifts.filter(s => s.staff_id === staff.id && s.date.startsWith(`${currentYear}-${formattedMonthStr}-`));

  // Selection-mode cell click: plain click toggles, Shift+click selects the date range from the anchor
  const handleCellSelect = (staff: Staff, day: number, shift: Shift, extendRange: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedShiftIds);

    if (extendRange && selectionAnchor && selectionAnchor.staffId === staff.id && selectedShiftIds.size > 0) {
      const [from, to] = selectionAnchor.day <= day ? [selectionAnchor.day, day] : [day, selectionAnchor.day];
      for (let d = from; d <= to; d++) {
        const dateStr = toDateStr(d);
        const inRange = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
        if (inRange) next.add(inRange.id);
      }
    } else if (next.has(shift.id)) {
      next.delete(shift.id);
    } else {
      next.add(shift.id);
    }

    setSelectionAnchor({ staffId: staff.id, day });
    onSelectionChange(next);
  };

  // Row checkbox: select every shift of the staff member, or clear them all if already fully selected
  const handleRowToggle = (staff: Staff) => {
    if (!onSelectionChange) return;
    const rowShifts = getRowShifts(staff);
    if (rowShifts.length === 0) return;
    const allSelected = rowShifts.every(s => selectedShiftIds.has(s.id));
    const next = new Set(selectedShiftIds);
    rowShifts.forEach(s => (allSelected ? next.delete(s.id) : next.add(s.id)));
    setSelectionAnchor(null);
    onSelectionChange(next);
  };

  const getRowSelectionState = (staff: Staff): 'all' | 'some' | 'none' => {
    const rowShifts = getRowShifts(staff);
    if (rowShifts.length === 0) return 'none';
    const count = rowShifts.filter(s => selectedShiftIds.has(s.id)).length;
    if (count === 0) return 'none';
    return count === rowShifts.length ? 'all' : 'some';
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
          <table className={`min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm ${selectionMode ? 'select-none' : ''}`}>
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
                const rowSelection = selectionMode ? getRowSelectionState(staff) : 'none';
                return (
                  <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-2 sm:px-4 py-1.5 sm:py-3 border-r border-slate-300 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-950 z-10 w-32 sm:w-56 md:w-64 shadow-xs">
                      <div className="flex items-start gap-1.5 sm:gap-2">
                        {selectionMode && (
                          <button
                            type="button"
                            onClick={() => handleRowToggle(staff)}
                            title={i18n.selectRowTitle}
                            className={`mt-0.5 flex-shrink-0 rounded transition-colors ${
                              rowSelection === 'none'
                                ? 'text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {rowSelection === 'all' ? (
                              <FiCheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            ) : rowSelection === 'some' ? (
                              <FiMinusSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            ) : (
                              <FiSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </button>
                        )}
                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/personel/${encodeURIComponent(staff.id)}?tahun=${currentYear}&bulan=${currentMonth}`}
                          title={`Lihat jadwal dinas personal ${staff.name}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate max-w-[92px] sm:max-w-[160px] md:max-w-[180px] text-[10px] sm:text-sm flex items-center gap-1 group/name"
                        >
                          <span className="truncate">{staff.name}</span>
                          <FiExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                        </Link>
                        {/* Ratings & Subgroup Pills */}
                        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                          {staff.group === 'CNS' && staff.ratings?.map(r => (
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
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const isToday = isCurrentCalendarMonth && day === todayDay;
                      const dateStr = toDateStr(day);
                      const shift = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
                      const pendingGap = gapEvents.find(g => g.shift_id === shift?.id && g.status === 'Pending');
                      const isSelected = selectionMode && !!shift && selectedShiftIds.has(shift.id);

                      const rawCode = shift?.shift_code || 'L';
                      const displayCode = getShortCode(rawCode);

                      return (
                        <td key={day} className={`p-0.5 text-center border-r border-slate-200 dark:border-slate-800 ${isToday ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : ''}`}>
                          <button
                            title={`${staff.name} - ${dateStr}: ${rawCode}`}
                            // Keep Shift+click from starting a text selection across the grid
                            onMouseDown={(e) => { if (selectionMode && e.shiftKey) e.preventDefault(); }}
                            onClick={(e) => {
                              if (!shift) return;
                              if (selectionMode) {
                                handleCellSelect(staff, day, shift, e.shiftKey);
                              } else if (pendingGap) {
                                onSelectGap(pendingGap, shift, staff);
                              } else {
                                onSelectShift(shift, staff);
                              }
                            }}
                            className={`w-7 h-7 sm:w-9 sm:h-9 text-[9px] sm:text-xs rounded transition-all mx-auto flex items-center justify-center text-center leading-none ${getShiftStyle(shift, pendingGap)} ${
                              isSelected
                                ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 scale-90'
                                : ''
                            }`}
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onToggleSelectionMode && (
            <button
              onClick={() => {
                setSelectionAnchor(null);
                onToggleSelectionMode();
              }}
              className={`py-1.5 px-3 border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs whitespace-nowrap ${
                selectionMode
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-300 dark:border-slate-700'
              }`}
            >
              <FiCheckSquare className="w-3.5 h-3.5" />
              <span>
                {selectionMode ? i18n.btnSelectModeActive : i18n.btnSelectMode}
                {selectionMode && selectedShiftIds.size > 0 && ` (${selectedShiftIds.size})`}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowShiftCodeModal(true)}
            className="py-1.5 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs group whitespace-nowrap"
          >
            <FiInfo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Kode Shift</span>
          </button>
        </div>
      </div>

      {selectionMode && (
        <div className="-mt-3 mb-4 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <FiInfo className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{i18n.selectModeHint}</span>
        </div>
      )}

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
