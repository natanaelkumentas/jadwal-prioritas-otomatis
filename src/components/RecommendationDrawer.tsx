'use client';

import React, { useState, useEffect } from 'react';
import { GapEvent, Shift, CandidateRecommendation } from '@/lib/scheduler-engine/types';
import { assignReplacement } from '@/app/actions/scheduler';

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

  // Fetch recommendations from Route Handler
  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/recommendations?gap_event_id=${gapEvent.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommended candidates.');
        }
        const data = await response.json();
        setCandidates(data);
        
        // Auto-select the top candidate (#1)
        if (data.length > 0) {
          setSelectedStaffId(data[0].staff_id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load recommendations.');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [gapEvent.id]);

  const selectedCandidate = candidates.find(c => c.staff_id === selectedStaffId);
  const isOverride = selectedCandidate ? selectedCandidate.rank > 1 : false;
  const isButtonDisabled = isOverride && !justification.trim();

  const handleAssign = async () => {
    if (!selectedStaffId || !selectedCandidate) return;

    setIsSubmitting(true);
    try {
      const result = await assignReplacement({
        gapEventId: gapEvent.id,
        shiftId: shift.id,
        candidateStaffId: selectedStaffId,
        score: selectedCandidate.score,
        breakdown: selectedCandidate.breakdown,
        reason: justification.trim() || 'SYSTEM_RECOMMENDED'
      });

      if (result.success) {
        onAssignSuccess();
        onClose();
      } else {
        alert(result.error || 'Assignment failed.');
      }
    } catch (err: any) {
      alert('Error during assignment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render score contribution progress bar
  const renderScoreBar = (label: string, value: number, maxWeight: number) => {
    const percentage = (value / maxWeight) * 100;
    return (
      <div className="mb-2.5">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300 font-semibold">{value.toFixed(3)} / {maxWeight.toFixed(2)}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-slate-400 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform translate-x-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <h3 className="text-md font-semibold text-slate-100">
            Resolve Roster Gap
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Shift: {shift.date} ({shift.shift_code}) — {gapEvent.reason}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
            <span className="animate-spin text-xl mb-3">🔄</span>
            <span>Running constraints filter & MCDA engine...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm">
            <h4 className="font-semibold mb-1">Critical Staffing Alert (0 Eligible Candidates)</h4>
            <p className="text-xs mt-1">
              Zero candidates satisfied all hard labor constraints (11-hour rest margins, availability, licences). Please resolve this shift gap manually in Supabase.
            </p>
          </div>
        ) : (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Eligible Replacement Candidates
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
                        <span className="font-semibold text-slate-200 text-sm">
                          {c.name}
                        </span>
                        {c.rank === 1 && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded mt-0.5 max-w-[85px]">
                            ★ RECOMMENDED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-200">
                        {c.score.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Rank #{c.rank}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Score Breakdown Analysis */}
            {selectedCandidate && (
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg mb-6">
                <h5 className="text-xs font-semibold text-slate-300 uppercase mb-3">
                  Score Contribution Analysis
                </h5>
                {renderScoreBar('Rating Coverage (Protect Specialized Staff)', selectedCandidate.breakdown.ratingCoverage, 0.35)}
                {renderScoreBar('Workload Balance (Fair Fatigue Distribution)', selectedCandidate.breakdown.workloadBalance, 0.25)}
                {renderScoreBar('Fatigue Margin (Buffer Rest Period)', selectedCandidate.breakdown.fatigueMargin, 0.20)}
                {renderScoreBar('Shift Recency (Avoid Night Burnout)', selectedCandidate.breakdown.recencyOfSameShift, 0.10)}
                {renderScoreBar('Group Continuity (Team Familiarity)', selectedCandidate.breakdown.groupContinuity, 0.10)}
              </div>
            )}

            {/* Justification Field (Mandatory on override) */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                Override Justification {isOverride && <span className="text-red-400">*</span>}
              </label>
              <textarea
                placeholder={
                  isOverride 
                    ? "Mandatory: Enter selection reason for bypassing the recommended candidate..."
                    : "Optional: Enter remarks (e.g. Swapped Shift)..."
                }
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 transition-colors"
              />
              {isOverride && !justification.trim() && (
                <span className="text-[11px] text-red-400 mt-1 block">
                  ⚠️ Override reason required to bypass the top candidate.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!loading && !error && candidates.length > 0 && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isButtonDisabled || isSubmitting}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg text-slate-900 transition-all ${
              isButtonDisabled || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-slate-200 hover:bg-slate-100 hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Replacement'}
          </button>
        </div>
      )}
    </div>
  );
}
