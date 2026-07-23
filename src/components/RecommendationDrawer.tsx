'use client';

import React, { useState, useEffect } from 'react';
import { Staff, Shift, GapEvent, CandidateRecommendation } from '@/lib/scheduler-engine/types';
import { assignReplacement } from '@/app/actions/scheduler';
import { i18n } from '@/lib/i18n';

interface RecommendationDrawerProps {
  gapEvent: GapEvent;
  shift: Shift;
  onClose: () => void;
  onAssignSuccess: () => void;
}

export default function RecommendationDrawer({
  gapEvent,
  shift,
  onClose,
  onAssignSuccess
}: RecommendationDrawerProps) {
  const [candidates, setCandidates] = useState<CandidateRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justificationError, setJustificationError] = useState<string | null>(null);

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

  const handleAssign = async () => {
    if (!selectedCandidate) return;

    if (isOverride && !justification.trim()) {
      setJustificationError(i18n.gapJustificationRequiredError);
      return;
    }

    setJustificationError(null);
    setIsSubmitting(true);

    try {
      const result = await assignReplacement({
        gapEventId: gapEvent.id,
        shiftId: shift.id,
        candidateStaffId: selectedCandidate.staff_id,
        score: selectedCandidate.score,
        breakdown: selectedCandidate.breakdown,
        reason: justification.trim() || (selectedCandidate.rank === 1 ? 'REKOMENDASI_SISTEM' : 'PEMBATALAN_MANUAL')
      });

      if (result.success) {
        onAssignSuccess();
        onClose();
      } else {
        alert(result.error || 'Gagal menyimpan penugasan pengganti.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan saat menyimpan penugasan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScoreBar = (label: string, value: number, maxWeight: number) => {
    const percentage = (value / maxWeight) * 100;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300 font-semibold">{value.toFixed(3)}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div 
            className="bg-slate-400 h-1.5 rounded-full transition-all duration-300" 
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
            {i18n.gapDrawerTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {i18n.gapDrawerSub} {shift.date} ({shift.shift_code}) — {i18n.gapDrawerReason} {gapEvent.reason}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs sm:text-sm">
            <span className="animate-spin text-xl mb-3">🔄</span>
            <span>{i18n.gapLoadingText}</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs sm:text-sm">
            ⚠️ {error}
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs sm:text-sm">
            <h4 className="font-semibold mb-1">{i18n.gapCriticalAlertTitle}</h4>
            <p className="text-xs mt-1 leading-relaxed">
              {i18n.gapCriticalAlertDesc}
            </p>
          </div>
        ) : (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {i18n.gapCandidatesTitle}
            </h4>
            
            {/* Candidates Radio List */}
            <div className="space-y-3 mb-6">
              {candidates.map((c) => (
                <label 
                  key={c.staff_id}
                  className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedStaffId === c.staff_id
                      ? 'border-slate-400 bg-slate-800/30'
                      : 'border-slate-800 bg-slate-900 hover:bg-slate-800/10'
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
                        className="text-slate-400 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-700"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                          {c.name}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {c.rank === 1 && (
                            <span className="text-[9px] sm:text-[10px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded">
                              {i18n.gapBadgeRecommended}
                            </span>
                          )}
                          {c.is_fallback && (
                            <span className="text-[9px] sm:text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                              {c.fallback_reason === 'Same Subgroup Member' ? i18n.fallbackBadgeSameGroup : i18n.fallbackBadgeEmergency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        {c.score.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Skor MCDA
                      </span>
                    </div>
                  </div>

                  {/* Expand score breakdown for selected candidate */}
                  {selectedStaffId === c.staff_id && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
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

            {/* Justification Text Area if Override */}
            {isOverride && (
              <div className="mb-6 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <label className="block text-xs font-semibold text-amber-400 mb-1">
                  {i18n.gapJustificationLabel} *
                </label>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  Sistem merekomendasikan {candidates[0]?.name}. Sesuai aturan audit, silakan masukkan alasan operasional jika Anda memilih {selectedCandidate?.name}.
                </p>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder={i18n.gapJustificationPlaceholder}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-slate-500"
                />
                {justificationError && (
                  <span className="text-[11px] text-red-400 mt-1 block">
                    {justificationError}
                  </span>
                )}
              </div>
            )}

            {/* Submit Assignment Button */}
            <button
              onClick={handleAssign}
              disabled={isSubmitting || !selectedStaffId}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
            >
              {isSubmitting ? 'Memproses Penugasan...' : i18n.btnConfirmAssignment}
            </button>
          </div>
        )}
      </div>

      {/* Footer Close Button */}
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
