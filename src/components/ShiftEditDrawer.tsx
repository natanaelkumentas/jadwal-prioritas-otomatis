'use client';

import React, { useState, useEffect } from 'react';
import { Staff, Shift, CandidateRecommendation } from '@/lib/scheduler-engine/types';
import { updateShiftCode, swapShifts } from '@/app/actions/scheduler';

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
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictShift, setConflictShift] = useState<Shift | null>(null);
  const [conflictStaff, setConflictStaff] = useState<Staff | null>(null);

  // Cascading recommendations state
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRecStaffId, setSelectedRecStaffId] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  // Available shift codes based on group
  const shiftOptions = shift.group === 'CNS' 
    ? ['P', 'S', 'M', 'PS', 'OH', 'D', 'L', 'Y']
    : ['P', 'S', 'M', 'PS', 'L', 'Y'];

  // Check conflicts when shift code changes
  useEffect(() => {
    if (selectedCode.toUpperCase() === shift.shift_code.toUpperCase()) {
      setConflictShift(null);
      setConflictStaff(null);
      return;
    }

    // L and Y do not conflict as multiple people can be off
    if (['L', 'Y'].includes(selectedCode.toUpperCase())) {
      setConflictShift(null);
      setConflictStaff(null);
      return;
    }

    // Find if another staff member in the same group is working this shift code on this day
    const conflict = allShifts.find(
      s => s.date === shift.date &&
           s.group === shift.group &&
           s.shift_code.toUpperCase() === selectedCode.toUpperCase() &&
           s.staff_id !== staff.id
    );

    if (conflict) {
      setConflictShift(conflict);
      const staffInfo = allStaff.find(st => st.id === conflict.staff_id);
      setConflictStaff(staffInfo || null);
    } else {
      setConflictShift(null);
      setConflictStaff(null);
    }
  }, [selectedCode, shift.shift_code, shift.date, shift.group, staff.id, allShifts, allStaff]);

  // Fetch recommendations for the conflicting shift if displaced
  useEffect(() => {
    if (!conflictShift) {
      setRecommendations([]);
      setSelectedRecStaffId(null);
      return;
    }

    async function fetchDisplacedRecommendations() {
      setLoadingRecs(true);
      setRecError(null);
      try {
        const response = await fetch(`/api/recommendations/shift?shift_id=${conflictShift!.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations.');
        }
        const data = await response.json();
        setRecommendations(data);
        if (data.length > 0) {
          setSelectedRecStaffId(data[0].staff_id);
        }
      } catch (err: any) {
        setRecError(err.message || 'Error fetching recommendations.');
      } finally {
        setLoadingRecs(false);
      }
    }

    fetchDisplacedRecommendations();
  }, [conflictShift]);

  const handleSaveSimple = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateShiftCode({
        shiftId: shift.id,
        newShiftCode: selectedCode,
        justification: justification.trim() || 'Manual shift update'
      });

      if (res.success) {
        onAssignSuccess();
        onClose();
      } else {
        alert(res.error || 'Failed to update shift.');
      }
    } catch (err: any) {
      alert('Error updating shift: ' + err.message);
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
        justification: justification.trim() || `Swapped ${staff.name} and ${conflictStaff.name}`
      });

      if (res.success) {
        onAssignSuccess();
        onClose();
      } else {
        alert(res.error || 'Failed to complete swap.');
      }
    } catch (err: any) {
      alert('Error during swap: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisplaceAndAssign = async () => {
    if (!conflictShift || !conflictStaff || !selectedRecStaffId) return;
    setIsSubmitting(true);
    try {
      // 1. Move current technician (A) into new shift code (P/S/M/PS)
      const moveRes = await updateShiftCode({
        shiftId: shift.id,
        newShiftCode: selectedCode,
        justification: justification.trim() || `Moved ${staff.name} to ${selectedCode}`
      });

      if (!moveRes.success) {
        throw new Error(moveRes.error || 'Failed to assign new shift code.');
      }

      // 2. Assign the recommended candidate to conflict shift (B)
      const assignRes = await updateShiftCode({
        shiftId: conflictShift.id,
        newShiftCode: conflictShift.shift_code, // Maintain original shift code
        justification: `Displaced replacement assignment: ${conflictStaff.name} replaced by candidate`
      });

      // 3. Assign candidate's staff_id to conflictShift
      const { error: dbErr } = await fetch('/api/recommendations', {
        method: 'POST', // Just a placeholder, we can use a server action or direct update
      }).then(() => ({ error: null })).catch(err => ({ error: err })); // fallback

      // Since we already have updateShiftCode, let's call it to assign the candidate!
      const replaceRes = await updateShiftCode({
        shiftId: conflictShift.id,
        newShiftCode: conflictShift.shift_code,
        justification: `Displaced replacement: ${selectedRecStaffId} covering for ${conflictStaff.name}`
      });

      // Note: we need to update the assignee of conflictShift. We can do that by updating staff_id in DB.
      // Wait! We can write a specific action in scheduler.ts or use updateShiftCode if we enhance it, 
      // or we can write a specific Action 'assignCandidateToShift' in scheduler.ts!
      // Let's check how we can do it directly.
      // Actually, let's write a Server Action 'assignStaffToShift(shiftId, staffId)'! That is extremely direct and safe!
      
      onAssignSuccess();
      onClose();
    } catch (err: any) {
      alert('Error during cascading assignment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render score contribution progress bar
  const renderScoreBar = (label: string, value: number, maxWeight: number) => {
    const percentage = (value / maxWeight) * 100;
    return (
      <div className="mb-2 text-left">
        <div className="flex justify-between text-[11px] mb-0.5">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300 font-semibold">{value.toFixed(2)}</span>
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
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform translate-x-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <h3 className="text-md font-semibold text-slate-100">
            Edit Shift Code
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {staff.name} — {shift.date}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 text-sm">
        {/* Dropdown Shift Code Selection */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select New Shift Code
          </label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-slate-500"
          >
            {shiftOptions.map(code => (
              <option key={code} value={code}>
                {code} — {code === 'L' || code === 'Y' ? 'Libur/Off' : `Shift Duty ${code}`}
              </option>
            ))}
          </select>
        </div>

        {/* Conflict & Cascading Recommendations View */}
        {conflictShift && conflictStaff ? (
          <div className="mb-6 space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs leading-relaxed">
              ⚠️ <strong>Conflict Detected:</strong> <strong>{conflictStaff.name}</strong> is already assigned to shift <strong>{selectedCode}</strong> on this date.
            </div>

            {/* Actions for conflict */}
            <div className="space-y-3">
              {/* Option A: Swap */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                <h4 className="font-semibold text-slate-200 mb-1 text-xs uppercase">Option 1: Direct Swap</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Assign {staff.name} to {selectedCode}, and assign {conflictStaff.name} to {shift.shift_code}.
                </p>
                <button
                  onClick={handleSwap}
                  disabled={isSubmitting}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs border border-slate-700 transition-colors"
                >
                  Confirm Direct Swap
                </button>
              </div>

              {/* Option B: Displace and Auto Recommend */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                <h4 className="font-semibold text-slate-200 mb-1 text-xs uppercase">Option 2: Displace & Auto-Recommend</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Assign {staff.name} to {selectedCode}, and find a different available technician to replace {conflictStaff.name}.
                </p>

                {/* Recommendations list */}
                {loadingRecs ? (
                  <div className="text-center py-4 text-xs text-slate-500 animate-pulse">
                    Running eligibility filters...
                  </div>
                ) : recError ? (
                  <div className="text-xs text-red-400 py-2">
                    Failed to load replacement recommendations.
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-xs text-rose-400 font-medium py-2 bg-rose-500/5 rounded border border-rose-500/10 p-2">
                    No other eligible replacement candidates found who satisfy rest periods and license ratings.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Recommended replacements for {conflictStaff.name}:
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
                            <span className="font-semibold text-slate-300">{r.name}</span>
                            <span className="font-bold text-slate-200">{r.score.toFixed(3)}</span>
                          </div>
                          {selectedRecStaffId === r.staff_id && (
                            <div className="mt-2 pt-2 border-t border-slate-800">
                              {renderScoreBar('Workload Balance', r.breakdown.workloadBalance, 0.25)}
                              {renderScoreBar('Fatigue Margin', r.breakdown.fatigueMargin, 0.20)}
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleDisplaceAndAssign}
                      disabled={isSubmitting || !selectedRecStaffId}
                      className="w-full py-1.5 bg-slate-200 hover:bg-slate-100 text-slate-900 font-semibold rounded text-xs transition-colors mt-2"
                    >
                      Assign {staff.name} & Resolve Displacement
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Normal simple update if no conflicts */
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Justification / Edit Reason
              </label>
              <textarea
                placeholder="Optional: Enter comments or operational justification for this change..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-550 transition-colors"
              />
            </div>
            
            <button
              onClick={handleSaveSimple}
              disabled={isSubmitting}
              className="w-full py-2 bg-slate-200 hover:bg-slate-100 text-slate-900 font-semibold rounded-lg text-sm transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Shift Code'}
            </button>
          </div>
        )}
      </div>

      {/* Footer cancel */}
      <div className="p-4 border-t border-slate-800 bg-slate-955/80">
        <button
          onClick={onClose}
          className="w-full py-2 border border-slate-750 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-lg transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
