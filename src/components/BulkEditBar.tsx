'use client';

import React, { useMemo, useState } from 'react';
import { Staff, Shift } from '@/lib/scheduler-engine/types';
import { updateShiftCodesBulk } from '@/app/actions/scheduler';
import { i18n } from '@/lib/i18n';
import { getShiftInfo } from '@/lib/shift-codes';
import { useToast } from '@/components/ToastProvider';
import { FiAlertTriangle, FiCheckSquare, FiLayers, FiX } from 'react-icons/fi';

interface BulkEditBarProps {
  selectedShifts: Shift[];
  allShifts: Shift[];
  allStaff: Staff[];
  onClear: () => void;
  onApplySuccess: () => void;
}

const SHIFT_OPTIONS = ['P', 'S', 'M', 'PS', 'OH', 'D', 'L', 'Y', 'CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
const LEAVE_CODES = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
const OFF_CODES = ['L', 'Y'];
const MAX_CONFLICTS_SHOWN = 8;

interface ConflictEntry {
  date: string;
  names: string[];
}

/**
 * Floating action bar shown while cells are selected in the roster grid.
 * Applies one shift code to every selected shift via a single bulk server action.
 */
export default function BulkEditBar({
  selectedShifts,
  allShifts,
  allStaff,
  onClear,
  onApplySuccess
}: BulkEditBarProps) {
  const [selectedCode, setSelectedCode] = useState<string>('L');
  const [justification, setJustification] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

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
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0" onClick={() => !isSubmitting && setShowConfirmModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 z-[101] max-h-[90vh] flex flex-col">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                conflicts.length > 0 || vacatedCount > 0
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
              }`}>
                {conflicts.length > 0 || vacatedCount > 0
                  ? <FiAlertTriangle className="w-5 h-5" />
                  : <FiCheckSquare className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {i18n.bulkConfirmTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {i18n.bulkConfirmDesc}
                </p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 pr-0.5">
              {/* Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Jumlah sel</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedShifts.length} sel · {staffCount} {i18n.bulkStaffLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Kode baru</span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${codeInfo.badgeStyle}`}>
                    {selectedCode} — {codeInfo.label}
                  </span>
                </div>
              </div>

              {/* Vacated work shifts notice */}
              {vacatedCount > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs leading-relaxed">
                  ℹ️ <strong>{vacatedCount}</strong> {i18n.bulkVacateNotice}
                </div>
              )}

              {/* Conflict warning list */}
              {conflicts.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2">
                  <div className="text-amber-700 dark:text-amber-400 font-semibold">
                    ⚠️ {i18n.bulkConflictTitle}
                  </div>
                  <p className="text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                    {i18n.bulkConflictDesc}
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {conflicts.slice(0, MAX_CONFLICTS_SHOWN).map(c => (
                      <li key={c.date} className="flex gap-2 text-slate-700 dark:text-slate-300">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">{c.date}</span>
                        <span className="truncate">{c.names.join(', ')}</span>
                      </li>
                    ))}
                    {conflicts.length > MAX_CONFLICTS_SHOWN && (
                      <li className="text-slate-500 dark:text-slate-400 italic">
                        +{conflicts.length - MAX_CONFLICTS_SHOWN} tanggal lainnya
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleApply}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                {isSubmitting ? 'Memproses...' : i18n.btnBulkConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
