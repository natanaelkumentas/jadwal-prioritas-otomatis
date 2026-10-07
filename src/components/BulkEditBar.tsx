'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Staff, Shift } from '@/lib/scheduler-engine/types';
import { updateShiftCodesBulk, batchUpdateShiftAssignments } from '@/app/actions/scheduler';
import { i18n } from '@/lib/i18n';
import { getShiftInfo } from '@/lib/shift-codes';
import { getRosterStaffOrder } from '@/lib/roster-order';
import { useToast } from '@/components/ToastProvider';
import { FiAlertTriangle, FiCheckSquare, FiLayers, FiX, FiCopy, FiClipboard } from 'react-icons/fi';

interface BulkEditBarProps {
  selectedShifts: Shift[];
  allShifts: Shift[];
  allStaff: Staff[];
  onClear: () => void;
  onApplySuccess: () => void;
  onSelectShifts?: (shiftIds: Set<string>) => void;
}

const SHIFT_OPTIONS = ['P', 'S', 'M', 'PS', 'OH', 'D', 'L', 'Y', 'CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
const LEAVE_CODES = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
const OFF_CODES = ['L', 'Y'];
const MAX_CONFLICTS_SHOWN = 8;
const CLIPBOARD_STORAGE_KEY = 'jadwal_shift_clipboard';

interface CopiedCellOffset {
  rowOffset: number;
  dayOffset: number;
  shiftCode: string;
}

interface Shift2DClipboard {
  cells: CopiedCellOffset[];
  rowCount: number;
  colCount: number;
  summary: string;
}

import BulkConfirmModal, { ConflictEntry } from './BulkConfirmModal';

/**
 * Floating action bar shown while cells are selected in the roster grid.
 * Applies one shift code to every selected shift via a single bulk server action,
 * and allows copying & pasting shift patterns across multiple cells.
 */
export default function BulkEditBar({
  selectedShifts,
  allShifts,
  allStaff,
  onClear,
  onApplySuccess,
  onSelectShifts
}: BulkEditBarProps) {
  const [selectedCode, setSelectedCode] = useState<string>('L');
  const [justification, setJustification] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clipboardData, setClipboardData] = useState<Shift2DClipboard | null>(null);
  const toast = useToast();

  // Load persisted clipboard from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
      if (stored) {
        setClipboardData(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    allStaff.forEach(s => map.set(s.id, s.name));
    return map;
  }, [allStaff]);

  const staffCount = useMemo(
    () => new Set(selectedShifts.map(s => s.staff_id).filter(Boolean)).size,
    [selectedShifts]
  );

  const isLeaveCode = LEAVE_CODES.includes(selectedCode);
  const isWorkCode = !isLeaveCode && !OFF_CODES.includes(selectedCode);

  // Work shifts that a leave code would leave unstaffed (mirrors updateShiftCodesBulk)
  const vacatedCount = isLeaveCode
    ? selectedShifts.filter(s => !OFF_CODES.includes(s.shift_code.toUpperCase())).length
    : 0;

  // Same rule as ShiftEditDrawer: two people on the same work code, same date, same group
  const conflicts = useMemo<ConflictEntry[]>(() => {
    if (!isWorkCode) return [];

    const selectedIds = new Set(selectedShifts.map(s => s.id));
    const nameOf = (id: string | null) => (id ? staffNameById.get(id) || id : '?');

    const byDateGroup = new Map<string, Shift[]>();
    selectedShifts.forEach(s => {
      const key = `${s.date}|${s.group}`;
      byDateGroup.set(key, [...(byDateGroup.get(key) || []), s]);
    });

    const result: ConflictEntry[] = [];
    byDateGroup.forEach((selected, key) => {
      const [date, group] = key.split('|');
      const others = allShifts.filter(o =>
        o.date === date &&
        o.group === group &&
        o.staff_id &&
        !selectedIds.has(o.id) &&
        o.shift_code.toUpperCase() === selectedCode
      );
      const names = Array.from(new Set([...selected, ...others].map(s => nameOf(s.staff_id))));
      if (names.length > 1) {
        result.push({ date, names });
      }
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [isWorkCode, selectedShifts, allShifts, selectedCode, staffNameById]);

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateShiftCodesBulk({
        shiftIds: selectedShifts.map(s => s.id),
        newShiftCode: selectedCode,
        justification: justification.trim() || `Ubah ${selectedShifts.length} shift menjadi ${selectedCode}`
      });

      if (res.success) {
        toast.success(`${res.updated ?? selectedShifts.length} ${i18n.bulkSuccess}`);
        setShowConfirmModal(false);
        setJustification('');
        onApplySuccess();
      } else {
        toast.error(res.error || 'Gagal menerapkan perubahan massal.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menerapkan perubahan massal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (selectedShifts.length === 0) return;

    const rosterOrder = getRosterStaffOrder(allStaff);
    const staffIndexMap = new Map<string, number>();
    rosterOrder.forEach((s, idx) => staffIndexMap.set(s.id, idx));

    const items = selectedShifts.map(s => {
      const staffIdx = staffIndexMap.get(s.staff_id) ?? 9999;
      const day = parseInt(s.date.split('-')[2], 10);
      return {
        shift: s,
        staffIdx,
        day,
        code: (s.shift_code || 'L').toUpperCase()
      };
    });

    const minStaffIdx = Math.min(...items.map(it => it.staffIdx));
    const minDay = Math.min(...items.map(it => it.day));

    const cells: CopiedCellOffset[] = items.map(it => ({
      rowOffset: it.staffIdx - minStaffIdx,
      dayOffset: it.day - minDay,
      shiftCode: it.code
    }));

    const uniqueRows = new Set(cells.map(c => c.rowOffset)).size;
    const uniqueDays = new Set(cells.map(c => c.dayOffset)).size;

    let summaryText = '';
    if (uniqueRows === 1) {
      const sortedCodes = [...cells].sort((a, b) => a.dayOffset - b.dayOffset).map(c => c.shiftCode);
      summaryText = `${cells.length} hari (${sortedCodes.slice(0, 5).join(', ')}${sortedCodes.length > 5 ? '...' : ''})`;
    } else {
      summaryText = `${uniqueRows} personel × ${uniqueDays} hari (${cells.length} sel)`;
    }

    const data: Shift2DClipboard = {
      cells,
      rowCount: uniqueRows,
      colCount: uniqueDays,
      summary: summaryText
    };

    try {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(data));
      setClipboardData(data);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        const textPayload = cells.map(c => c.shiftCode).join(', ');
        navigator.clipboard.writeText(textPayload).catch(() => {});
      }
    } catch {
      // ignore
    }

    toast.success(`${summaryText} ${i18n.bulkCopySuccess}`);
  };

  const handlePaste = async () => {
    let currentClipboard = clipboardData;
    if (!currentClipboard) {
      try {
        const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
        if (stored) currentClipboard = JSON.parse(stored);
      } catch {
        // ignore
      }
    }

    // Support backward compatibility if stored as older { codes: string[] }
    if (currentClipboard && !currentClipboard.cells && (currentClipboard as any).codes) {
      const legacyCodes: string[] = (currentClipboard as any).codes;
      currentClipboard = {
        cells: legacyCodes.map((code, idx) => ({ rowOffset: 0, dayOffset: idx, shiftCode: code })),
        rowCount: 1,
        colCount: legacyCodes.length,
        summary: `${legacyCodes.length} shift`
      };
    }

    if (!currentClipboard || !currentClipboard.cells || currentClipboard.cells.length === 0) {
      toast.error(i18n.bulkPasteEmpty);
      return;
    }

    if (selectedShifts.length === 0) return;

    const rosterOrder = getRosterStaffOrder(allStaff);
    const staffIndexMap = new Map<string, number>();
    rosterOrder.forEach((s, idx) => staffIndexMap.set(s.id, idx));

    // Top-left anchor shift from selection: minimum staffIdx in roster order, then minimum day
    const selectedItems = selectedShifts.map(s => ({
      shift: s,
      staffIdx: staffIndexMap.get(s.staff_id) ?? 9999,
      day: parseInt(s.date.split('-')[2], 10)
    }));

    selectedItems.sort((a, b) => {
      if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;
      return a.day - b.day;
    });

    const anchor = selectedItems[0];
    const anchorShift = anchor.shift;
    const [anchorYear, anchorMonthStr] = anchorShift.date.split('-');
    const totalDaysInMonth = new Date(parseInt(anchorYear, 10), parseInt(anchorMonthStr, 10), 0).getDate();

    const assignments: { shiftId: string; newShiftCode: string }[] = [];
    const targetShiftIds = new Set<string>();

    for (const cell of currentClipboard.cells) {
      const targetStaffIdx = anchor.staffIdx + cell.rowOffset;
      const targetDay = anchor.day + cell.dayOffset;

      if (targetStaffIdx < 0 || targetStaffIdx >= rosterOrder.length) continue;
      if (targetDay < 1 || targetDay > totalDaysInMonth) continue;

      const targetStaff = rosterOrder[targetStaffIdx];
      const targetDateStr = `${anchorYear}-${anchorMonthStr}-${targetDay.toString().padStart(2, '0')}`;

      const matchedShift = allShifts.find(s => s.staff_id === targetStaff.id && s.date === targetDateStr);
      if (matchedShift) {
        assignments.push({
          shiftId: matchedShift.id,
          newShiftCode: cell.shiftCode
        });
        targetShiftIds.add(matchedShift.id);
      }
    }

    if (assignments.length === 0) {
      toast.error('Tidak ada sel target yang valid untuk ditempelkan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await batchUpdateShiftAssignments({
        assignments,
        justification: `Tempel ${assignments.length} shift dari clipboard (${currentClipboard.summary})`
      });

      if (res.success) {
        toast.success(`${res.updated ?? assignments.length} ${i18n.bulkPasteSuccess}`);
        if (onSelectShifts && targetShiftIds.size > 0) {
          onSelectShifts(targetShiftIds);
        }
        onApplySuccess();
      } else {
        toast.error(res.error || 'Gagal menempelkan shift dari clipboard.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menempelkan shift: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts: Ctrl+C to copy, Ctrl+V to paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShifts, clipboardData, isSubmitting]);

  const codeInfo = getShiftInfo(selectedCode);

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-5 sm:w-auto sm:max-w-[calc(100vw-2rem)] z-40 safe-area-bottom">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-900/20 dark:shadow-black/50 p-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Selection summary */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <FiLayers className="w-4 h-4" />
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                {selectedShifts.length} {i18n.bulkSelectedLabel}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {staffCount} {i18n.bulkStaffLabel}
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700" />

          {/* Code picker + note */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label className="hidden md:block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
              {i18n.bulkNewCodeLabel}
            </label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="flex-1 sm:flex-none sm:w-52 p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 dark:focus:border-slate-500 text-xs font-semibold"
            >
              {SHIFT_OPTIONS.map(code => (
                <option key={code} value={code}>
                  {i18n.shiftCodeDesc[code as keyof typeof i18n.shiftCodeDesc] || code}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={i18n.bulkJustificationPlaceholder}
              className="hidden lg:block w-56 p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-slate-500 text-xs"
            />
          </div>

          {/* Copy & Paste buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isSubmitting || selectedShifts.length === 0}
              title="Salin pola shift sel terpilih (Ctrl+C)"
              className="px-2.5 sm:px-3 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-500/30 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <FiCopy className="w-3.5 h-3.5" />
              <span>{i18n.btnBulkCopy}</span>
            </button>
            <button
              type="button"
              onClick={handlePaste}
              disabled={isSubmitting || !clipboardData || !clipboardData.cells || clipboardData.cells.length === 0 || selectedShifts.length === 0}
              title={clipboardData && clipboardData.cells && clipboardData.cells.length > 0 ? `Tempel ${clipboardData.summary} (Ctrl+V)` : i18n.bulkPasteEmpty}
              className="px-2.5 sm:px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 disabled:opacity-40 disabled:pointer-events-none text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-500/30 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <FiClipboard className="w-3.5 h-3.5" />
              <span>{i18n.btnBulkPaste}</span>
              {clipboardData && clipboardData.cells && clipboardData.cells.length > 0 && (
                <span className="text-[10px] opacity-80 font-normal">({clipboardData.cells.length})</span>
              )}
            </button>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClear}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1"
            >
              <FiX className="w-3.5 h-3.5" />
              {i18n.btnBulkClear}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting || selectedShifts.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <FiCheckSquare className="w-3.5 h-3.5" />
              {i18n.btnBulkApply}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Change Confirmation Modal Popup */}
      <BulkConfirmModal
        isOpen={showConfirmModal}
        isSubmitting={isSubmitting}
        selectedShiftsCount={selectedShifts.length}
        staffCount={staffCount}
        selectedCode={selectedCode}
        codeInfo={codeInfo}
        vacatedCount={vacatedCount}
        conflicts={conflicts}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleApply}
      />
    </>
  );
}
