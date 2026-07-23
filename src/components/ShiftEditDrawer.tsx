'use client';

import React, { useState, useEffect } from 'react';
import { Staff, Shift, CandidateRecommendation } from '@/lib/scheduler-engine/types';
import { updateShiftCode, swapShifts, assignLeaveAndReplacement } from '@/app/actions/scheduler';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/components/ToastProvider';
import { FiAlertTriangle, FiRefreshCw, FiX, FiCheck } from 'react-icons/fi';

interface ShiftEditDrawerProps {
  shift: Shift;
  staff: Staff;
  allShifts: Shift[];
  allStaff: Staff[];
  onClose: () => void;
  onAssignSuccess: () => void;
}

export default function ShiftEditDrawer({
  shift,
  staff,
  allShifts,
  allStaff,
  onClose,
  onAssignSuccess
}: ShiftEditDrawerProps) {
  const [selectedCode, setSelectedCode] = useState<string>(shift.shift_code);
  const [justification, setJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conflict state when changing a shift code to another active working shift
  const [conflictShift, setConflictShift] = useState<Shift | null>(null);
  const [conflictStaff, setConflictStaff] = useState<Staff | null>(null);

  // Cascading recommendations state for conflict resolution
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [selectedRecStaffId, setSelectedRecStaffId] = useState<string | null>(null);

  // Leave assignment & vacated shift recommendations state
  const [vacatedRecs, setVacatedRecs] = useState<CandidateRecommendation[]>([]);
  const [loadingVacatedRecs, setLoadingVacatedRecs] = useState(false);
  const [vacatedRecError, setVacatedRecError] = useState<string | null>(null);
  const [selectedVacatedStaffId, setSelectedVacatedStaffId] = useState<string | null>(null);

  const shiftOptions = ['P', 'S', 'M', 'PS', 'OH', 'D', 'L', 'Y', 'CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
  const toast = useToast();

  const isLeaveCode = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'].includes(selectedCode);
  const wasWorkingShift = !['L', 'Y'].includes(shift.shift_code.toUpperCase());
  const isVacatingWorkShift = isLeaveCode && wasWorkingShift;

  // Detect conflict on target date & target shift code
  useEffect(() => {
    if (selectedCode === shift.shift_code || ['L', 'Y', 'CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'].includes(selectedCode)) {
      setConflictShift(null);
      setConflictStaff(null);
      return;
    }

    const existingShift = allShifts.find(s => 
      s.date === shift.date && 
      s.group === shift.group &&
      s.shift_code.toUpperCase() === selectedCode.toUpperCase() &&
      s.staff_id !== staff.id &&
      s.staff_id !== null
    );

    if (existingShift && existingShift.staff_id) {
      setConflictShift(existingShift);
      const cStaff = allStaff.find(st => st.id === existingShift.staff_id) || null;
      setConflictStaff(cStaff);
    } else {
      setConflictShift(null);
      setConflictStaff(null);
    }
  }, [selectedCode, shift.date, shift.group, shift.shift_code, staff.id, allShifts, allStaff]);

  // Fetch recommendations for conflict displacement
  useEffect(() => {
    if (!conflictShift) {
      setRecommendations([]);
      setSelectedRecStaffId(null);
      return;
    }

    async function fetchConflictRecs() {
      setLoadingRecs(true);
      setRecError(null);
      try {
        const res = await fetch(`/api/recommendations/shift?shift_id=${conflictShift!.id}`);
        if (!res.ok) throw new Error('Gagal memuat rekomendasi pengganti.');
        const data = await res.json();
        const filtered = data.filter((r: CandidateRecommendation) => r.staff_id !== staff.id);
        setRecommendations(filtered);
        if (filtered.length > 0) {
          setSelectedRecStaffId(filtered[0].staff_id);
        }
      } catch (err: any) {
        setRecError(err.message);
      } finally {
        setLoadingRecs(false);
      }
    }

    fetchConflictRecs();
  }, [conflictShift, staff.id]);

  // Fetch recommendations for vacated shift on leave assignment
  useEffect(() => {
    if (!isVacatingWorkShift) {
      setVacatedRecs([]);
      setSelectedVacatedStaffId(null);
      return;
    }

    async function fetchVacatedRecs() {
      setLoadingVacatedRecs(true);
      setVacatedRecError(null);
      try {
        const res = await fetch(`/api/recommendations/shift?shift_id=${shift.id}`);
        if (!res.ok) throw new Error('Gagal memuat rekomendasi pengganti shift yang ditinggalkan.');
        const data = await res.json();
        const filtered = data.filter((r: CandidateRecommendation) => r.staff_id !== staff.id);
        setVacatedRecs(filtered);
        if (filtered.length > 0) {
          setSelectedVacatedStaffId(filtered[0].staff_id);
        }
      } catch (err: any) {
        setVacatedRecError(err.message);
      } finally {
        setLoadingVacatedRecs(false);
      }
    }

    fetchVacatedRecs();
  }, [isVacatingWorkShift, shift.id, staff.id]);

  const handleSimpleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateShiftCode({
        shiftId: shift.id,
        newShiftCode: selectedCode,
        justification: justification.trim() || `Ubah shift ${staff.name} menjadi ${selectedCode}`
      });

      if (res.success) {
        onAssignSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Gagal mengubah kode shift.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat mengubah kode shift: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwap = async () => {
    if (!conflictShift || !conflictStaff) return;
    setIsSubmitting(true);
    try {
      const res = await swapShifts({
        shiftAId: shift.id,
        shiftBId: conflictShift.id,
        justification: justification.trim() || `Tukar shift langsung antara ${staff.name} dan ${conflictStaff.name}`
      });

      if (res.success) {
        onAssignSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Gagal melakukan tukar shift.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat melakukan tukar shift: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisplaceAndAssign = async () => {
    if (!conflictShift || !conflictStaff || !selectedRecStaffId) return;
    setIsSubmitting(true);
    try {
      const targetRes = await updateShiftCode({
        shiftId: shift.id,
        newShiftCode: selectedCode,
        justification: `Penugasan baru: ${staff.name} ke ${selectedCode}`
      });

      if (!targetRes.success) {
        throw new Error(targetRes.error || 'Gagal memperbarui shift utama.');
      }

      const replaceRes = await updateShiftCode({
        shiftId: conflictShift.id,
        newShiftCode: conflictShift.shift_code,
        justification: `Pengganti terpisah: ${selectedRecStaffId} menggantikan ${conflictStaff.name}`
      });

      if (!replaceRes.success) {
        throw new Error(replaceRes.error || 'Gagal menugaskan pengganti.');
      }

      onAssignSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memproses penugasan bertingkat: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignLeave = async (withReplacement: boolean) => {
    setIsSubmitting(true);
    try {
      const res = await assignLeaveAndReplacement({
        shiftId: shift.id,
        leaveCode: selectedCode,
        replacementStaffId: withReplacement ? selectedVacatedStaffId : null,
        justification: justification.trim() || `Penetapan izin ${selectedCode} untuk ${staff.name}`
      });

      if (res.success) {
        onAssignSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Gagal menetapkan izin/cuti.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menetapkan izin: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScoreBar = (label: string, value: number, maxWeight: number) => {
    const percentage = (value / maxWeight) * 100;
    return (
      <div className="mb-2 text-left">
        <div className="flex justify-between text-[11px] mb-0.5">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300 font-semibold">{value.toFixed(3)}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1">
          <div 
            className="bg-slate-400 h-1 rounded-full" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform translate-x-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-100">
            {i18n.editDrawerTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {staff.name} — {shift.date} (Shift Saat Ini: {shift.shift_code})
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs sm:text-sm">
        {/* Dropdown Shift Code Selection */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {i18n.editSelectCodeLabel}
          </label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500 text-xs sm:text-sm"
          >
            {shiftOptions.map(code => (
              <option key={code} value={code}>
                {i18n.shiftCodeDesc[code as keyof typeof i18n.shiftCodeDesc] || code}
              </option>
            ))}
          </select>
        </div>

        {/* View 1: Vacating Duty Shift for Leave */}
        {isVacatingWorkShift ? (
          <div className="mb-6 space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-xs leading-relaxed">
              ℹ️ <strong>{i18n.vacatingShiftAlertTitle}</strong> Mengubah <strong>{staff.name}</strong> menjadi <strong>{selectedCode}</strong> mengosongkan shift kerja <strong>{shift.shift_code}</strong> pada tanggal {shift.date}.
            </div>

            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg space-y-3">
              <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                {i18n.vacatedRecsTitle} ({shift.shift_code})
              </h4>
              <p className="text-xs text-slate-400">
                Pilih kandidat layak untuk menggantikan shift <strong>{shift.shift_code}</strong> yang ditinggalkan oleh {staff.name}:
              </p>

              {loadingVacatedRecs ? (
                <div className="text-center py-4 text-xs text-slate-500 animate-pulse">
                  Menjalankan filter kelayakan...
                </div>
              ) : vacatedRecError ? (
                <div className="text-xs text-red-400 py-2">
                  {vacatedRecError}
                </div>
              ) : vacatedRecs.length === 0 ? (
                <div className="text-xs text-amber-400 font-medium py-2 bg-amber-500/5 rounded border border-amber-500/10 p-2">
                  {i18n.gapCriticalAlertTitle}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {vacatedRecs.map(r => (
                    <label
                      key={r.staff_id}
                      onClick={() => setSelectedVacatedStaffId(r.staff_id)}
                      className={`flex flex-col p-2.5 border rounded cursor-pointer text-xs transition-all ${
                        selectedVacatedStaffId === r.staff_id
                          ? 'border-slate-400 bg-slate-800/40'
                          : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-300">{r.name}</span>
                          {r.is_fallback && (
                            <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-1 py-0.5 rounded mt-0.5 w-max">
                              {r.fallback_reason === 'Same Subgroup Member' ? i18n.fallbackBadgeSameGroup : i18n.fallbackBadgeEmergency}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-200">{r.score.toFixed(3)}</span>
                      </div>
                      {selectedVacatedStaffId === r.staff_id && (
                        <div className="mt-2 pt-2 border-t border-slate-800">
                          {renderScoreBar(i18n.gapFactorWorkload, r.breakdown.workloadBalance, 0.25)}
                          {renderScoreBar(i18n.gapFactorFatigue, r.breakdown.fatigueMargin, 0.20)}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="pt-2 space-y-2 border-t border-slate-800">
                <button
                  onClick={() => handleAssignLeave(true)}
                  disabled={isSubmitting || !selectedVacatedStaffId || vacatedRecs.length === 0}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-xs transition-colors"
                >
                  {isSubmitting ? 'Memproses...' : i18n.btnConfirmLeaveWithReplacement}
                </button>

                <button
                  onClick={() => handleAssignLeave(false)}
                  disabled={isSubmitting}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs border border-slate-700 transition-colors"
                >
                  {i18n.btnConfirmLeaveOnly}
                </button>
              </div>
            </div>
          </div>
        ) : conflictShift && conflictStaff ? (
          /* View 2: Conflict & Cascading Swap Recommendations View */
          <div className="mb-6 space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs leading-relaxed">
              ⚠️ <strong>{i18n.conflictDetectedTitle}</strong> <strong>{conflictStaff.name}</strong> {i18n.conflictDetectedMsg}
            </div>

            {/* Actions for conflict */}
            <div className="space-y-3">
              {/* Option A: Swap */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                <h4 className="font-semibold text-slate-200 mb-1 text-xs uppercase">{i18n.optionSwapTitle}</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Tugaskan {staff.name} ke shift {selectedCode}, dan tugaskan {conflictStaff.name} ke shift {shift.shift_code}.
                </p>
                <button
                  onClick={handleSwap}
                  disabled={isSubmitting}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700 transition-colors"
                >
                  {i18n.btnConfirmSwap}
                </button>
              </div>

              {/* Option B: Displace and Auto Recommend */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                <h4 className="font-semibold text-slate-200 mb-1 text-xs uppercase">{i18n.optionDisplaceTitle}</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Tugaskan {staff.name} ke shift {selectedCode}, dan cari teknisi lain yang tersedia untuk menggantikan {conflictStaff.name}.
                </p>

                {/* Recommendations list */}
                {loadingRecs ? (
                  <div className="text-center py-4 text-xs text-slate-500 animate-pulse">
                    Menjalankan filter kelayakan...
                  </div>
                ) : recError ? (
                  <div className="text-xs text-red-400 py-2">
                    Gagal memuat rekomendasi pengganti.
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-xs text-rose-400 font-medium py-2 bg-rose-500/5 rounded border border-rose-500/10 p-2">
                    {i18n.gapCriticalAlertTitle}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {i18n.displaceRecsTitle} ({conflictStaff.name}):
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {recommendations.map(r => (
                        <label
                          key={r.staff_id}
                          className={`flex flex-col p-2.5 border rounded cursor-pointer text-xs transition-all ${
                            selectedRecStaffId === r.staff_id
                              ? 'border-slate-450 bg-slate-800/35'
                              : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-300">{r.name}</span>
                              {r.is_fallback && (
                                <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-1 py-0.5 rounded mt-0.5 w-max">
                                  {r.fallback_reason === 'Same Subgroup Member' ? i18n.fallbackBadgeSameGroup : i18n.fallbackBadgeEmergency}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-slate-200">{r.score.toFixed(3)}</span>
                          </div>
                          {selectedRecStaffId === r.staff_id && (
                            <div className="mt-2 pt-2 border-t border-slate-800">
                              {renderScoreBar(i18n.gapFactorWorkload, r.breakdown.workloadBalance, 0.25)}
                              {renderScoreBar(i18n.gapFactorFatigue, r.breakdown.fatigueMargin, 0.20)}
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleDisplaceAndAssign}
                      disabled={isSubmitting || !selectedRecStaffId}
                      className="w-full py-2 bg-slate-200 hover:bg-slate-100 text-slate-900 font-bold rounded-lg text-xs transition-colors mt-2"
                    >
                      {i18n.btnDisplaceAndAssign}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* View 3: Normal Simple Shift Code Update */
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {i18n.editJustificationLabel}
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={i18n.editJustificationPlaceholder}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-slate-500"
              />
            </div>

            <button
              onClick={handleSimpleSave}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
            >
              {isSubmitting ? 'Memproses Perubahan...' : i18n.btnSaveShiftCode}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <button
          onClick={onClose}
          className="w-full py-2 border border-slate-750 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
        >
          {i18n.btnCloseDrawer}
        </button>
      </div>
    </div>
  );
}
