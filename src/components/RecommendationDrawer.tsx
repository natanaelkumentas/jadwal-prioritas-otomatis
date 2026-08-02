'use client';

import React, { useState, useEffect } from 'react';
import { Staff, Shift, GapEvent, CandidateRecommendation } from '@/lib/scheduler-engine/types';
import { assignReplacement } from '@/app/actions/scheduler';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/components/ToastProvider';
import { FiStar, FiAlertTriangle, FiRefreshCw, FiX, FiCheck, FiEdit3, FiSliders, FiUserCheck, FiSearch } from 'react-icons/fi';

interface RecommendationDrawerProps {
  gapEvent: GapEvent;
  shift: Shift;
  staff?: Staff | null;
  allStaff?: Staff[];
  onClose: () => void;
  onAssignSuccess: () => void;
  onSwitchToEdit?: () => void;
}

export default function RecommendationDrawer({
  gapEvent,
  shift,
  staff,
  allStaff = [],
  onClose,
  onAssignSuccess,
  onSwitchToEdit
}: RecommendationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'dss' | 'manual'>('dss');
  const [candidates, setCandidates] = useState<CandidateRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justificationError, setJustificationError] = useState<string | null>(null);

  // Manual Override Tab States
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [selectedManualStaffId, setSelectedManualStaffId] = useState<string | null>(null);
  const [manualJustification, setManualJustification] = useState('');

  const toast = useToast();

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/recommendations?gap_event_id=${gapEvent.id}`);
        if (!response.ok) {
          throw new Error('Gagal mengambil data rekomendasi pengganti.');
        }
        const data = await response.json();
        setCandidates(data);
        if (data.length > 0) {
          setSelectedStaffId(data[0].staff_id);
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memproses sistem rekomendasi.');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [gapEvent.id]);

  const selectedCandidate = candidates.find(c => c.staff_id === selectedStaffId);
  const isOverride = selectedCandidate && selectedCandidate.rank !== 1;

  // Filter all staff for manual assignment tab
  const filteredAllStaff = allStaff.filter(s =>
    s.name.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
    (s.sub_group && s.sub_group.toLowerCase().includes(manualSearchTerm.toLowerCase()))
  );

  async function handleAssign() {
    const targetStaffId = activeTab === 'dss' ? selectedStaffId : selectedManualStaffId;
    const targetReason = activeTab === 'dss' 
      ? (isOverride ? justification.trim() : (selectedCandidate?.rank === 1 ? 'REKOMENDASI_SISTEM' : 'PEMBATALAN_MANUAL'))
      : (manualJustification.trim() || 'PENUGASAN_MANUAL_ADMIN');

    if (activeTab === 'dss' && isOverride && !justification.trim()) {
      setJustificationError(i18n.gapJustificationRequiredError);
      return;
    }

    if (!targetStaffId) return;

    setJustificationError(null);
    setIsSubmitting(true);

    try {
      const result = await assignReplacement({
        gapEventId: gapEvent.id,
        shiftId: shift.id,
        candidateStaffId: targetStaffId,
        score: activeTab === 'dss' ? (selectedCandidate?.score || 0) : 0,
        breakdown: activeTab === 'dss' ? (selectedCandidate?.breakdown || {}) : {},
        reason: targetReason
      });

      if (result.success) {
        toast.success('Penugasan teknisi pengganti berhasil disimpan!');
        onAssignSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Gagal menyimpan penugasan pengganti.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menyimpan penugasan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderScoreBar = (label: string, value: number, maxWeight: number) => {
    const percentage = (value / maxWeight) * 100;
    return (
      <div className="mb-1.5 text-left">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="text-slate-700 dark:text-slate-200 font-semibold">{value.toFixed(3)}</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1">
          <div 
            className="bg-emerald-500 dark:bg-slate-400 h-1 rounded-full" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform translate-x-0 safe-area-bottom">
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mt-2" />

        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
              {i18n.gapDrawerTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {staff?.name ? `${staff.name} — ` : ''}{i18n.gapDrawerSub} {shift.date} ({shift.shift_code}) — {i18n.gapDrawerReason} {gapEvent.reason}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('dss')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'dss'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FiSliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{i18n.tabDssRecommendations}</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FiUserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{i18n.tabManualOverride}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'dss' ? (
            loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs sm:text-sm">
                <FiRefreshCw className="w-5 h-5 animate-spin text-emerald-400 mb-3" />
                <span>{i18n.gapLoadingText}</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs sm:text-sm flex items-center gap-2">
                <FiAlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs sm:text-sm">
                <h4 className="font-semibold mb-1">{i18n.gapCriticalAlertTitle}</h4>
                <p className="text-xs mt-1 leading-relaxed">
                  {i18n.gapCriticalAlertDesc}
                </p>
                <button
                  onClick={() => setActiveTab('manual')}
                  className="mt-3 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded font-semibold text-xs transition-colors"
                >
                  Buka Penugasan Manual (Semua Personel) →
                </button>
              </div>
            ) : (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  {i18n.gapCandidatesTitle}
                </h4>
                <div className="space-y-3 mb-6">
                  {candidates.map((c) => (
                    <label 
                      key={c.staff_id}
                      className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedStaffId === c.staff_id
                          ? 'border-emerald-500 dark:border-slate-400 bg-emerald-50 dark:bg-slate-800/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="candidate"
                            value={c.staff_id}
                            checked={selectedStaffId === c.staff_id}
                            onChange={() => {
                              setSelectedStaffId(c.staff_id);
                              if (c.rank === 1) setJustification('');
                            }}
                            className="text-emerald-600 dark:text-slate-400 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">
                              {c.name}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {c.rank === 1 && (
                                <span className="text-[9px] sm:text-[10px] bg-emerald-100 dark:bg-slate-800 text-emerald-700 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded">
                                  {i18n.gapBadgeRecommended}
                                </span>
                              )}
                              {c.is_fallback && (
                                <span className="text-[9px] sm:text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                                  {c.fallback_reason}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {c.score.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Skor MCDA
                          </span>
                        </div>
                      </div>
                      {selectedStaffId === c.staff_id && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                            {i18n.gapScoreBreakdownTitle}
                          </span>
                          {renderScoreBar(i18n.gapFactorRating, c.breakdown.ratingCoverage, 0.35)}
                          {renderScoreBar(i18n.gapFactorWorkload, c.breakdown.workloadBalance, 0.25)}
                          {renderScoreBar(i18n.gapFactorFatigue, c.breakdown.fatigueMargin, 0.20)}
                          {renderScoreBar(i18n.gapFactorRecency, c.breakdown.recencyOfSameShift, 0.10)}
                          {renderScoreBar(i18n.gapFactorGroup, c.breakdown.groupContinuity, 0.10)}
                        </div>
                      )}
                    </label>
                  ))}
                </div>

                {isOverride && (
                  <div className="mb-6 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      {i18n.gapJustificationLabel} *
                    </label>
                    <textarea
                      rows={2}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder={i18n.gapJustificationPlaceholder}
                      className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    {justificationError && (
                      <span className="text-[11px] text-red-400 mt-1 block">
                        {justificationError}
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={handleAssign}
                  disabled={isSubmitting || !selectedStaffId}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 font-bold rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Memproses Penugasan...' : i18n.btnConfirmAssignment}
                </button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs leading-relaxed">
                👑 <strong>{i18n.manualOverrideNotice}</strong>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari personel..."
                  value={manualSearchTerm}
                  onChange={(e) => setManualSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
                <FiSearch className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950/60">
                {filteredAllStaff.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">Tidak ada personel ditemukan.</div>
                ) : (
                  filteredAllStaff.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-2.5 rounded border cursor-pointer text-xs transition-all ${
                        selectedManualStaffId === s.id
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 font-semibold text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="manualStaff"
                          value={s.id}
                          checked={selectedManualStaffId === s.id}
                          onChange={() => setSelectedManualStaffId(s.id)}
                          className="text-amber-600 focus:ring-0"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs">{s.name}</span>
                          <span className="text-[10px] text-slate-500">{s.sub_group} — {s.role_level}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        {s.id}
                      </span>
                    </label>
                  ))
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Catatan Operasional:
                </label>
                <textarea
                  rows={2}
                  value={manualJustification}
                  onChange={(e) => setManualJustification(e.target.value)}
                  placeholder="Masukkan alasan operasional..."
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleAssign}
                disabled={isSubmitting || !selectedManualStaffId}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs sm:text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <FiUserCheck className="w-4 h-4" />
                {isSubmitting ? 'Memproses Penugasan...' : i18n.btnConfirmManualAssignment}
              </button>
            </div>
          )}
        </div>

        {onSwitchToEdit && (
          <div className="px-4 pt-3 pb-1 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
              {i18n.cancelLeaveOverrideDesc}
            </p>
            <button
              onClick={onSwitchToEdit}
              className="w-full py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FiEdit3 className="w-3.5 h-3.5" />
              {i18n.btnCancelLeaveOverride}
            </button>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
          >
            {i18n.btnCloseDrawer}
          </button>
        </div>
      </div>
    </>
  );
}
