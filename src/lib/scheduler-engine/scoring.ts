import { Staff, Shift, ScoreBreakdown, CandidateRecommendation } from './types';
import { getShiftHours, getDaysDiff } from './filters';

// Calculate workload for a candidate (total active working shifts)
export function getWorkloadCount(candidateId: string, allShifts: Shift[]): number {
  return allShifts.filter(
    s => s.staff_id === candidateId && 
    s.shift_code.toUpperCase() !== 'L' && 
    s.shift_code.toUpperCase() !== 'Y'
  ).length;
}

// Get the minimum rest period for the candidate around the target date (in hours)
export function getMinRestBuffer(
  candidateId: string,
  date: string,
  targetShiftCode: string,
  group: 'CNS' | 'ESS',
  allShifts: Shift[]
): number {
  const targetHours = getShiftHours(targetShiftCode, group);
  if (!targetHours) return 48.0; // Default large rest if target is L/Y

  const candidateShifts = allShifts.filter(s => s.staff_id === candidateId);
  let minRest = 48.0; // Initialize with a default maximum rest (2 days)

  for (const s of candidateShifts) {
    const sHours = getShiftHours(s.shift_code, s.group);
    if (!sHours) continue;

    const daysDiff = getDaysDiff(s.date, date);
    
    if (daysDiff === 1) {
      // s is the day before (s is previous, target is next)
      const rest = (24.0 + targetHours.start) - sHours.end;
      if (rest < minRest) minRest = rest;
    } else if (daysDiff === -1) {
      // s is the day after (target is previous, s is next)
      const rest = (24.0 + sHours.start) - targetHours.end;
      if (rest < minRest) minRest = rest;
    } else if (daysDiff === 0) {
      // Same day
      const rest = targetHours.start - sHours.end;
      const reverseRest = sHours.start - targetHours.end;
      if (rest >= 0 && rest < minRest) minRest = rest;
      if (reverseRest >= 0 && reverseRest < minRest) minRest = reverseRest;
    }
  }

  return minRest;
}

// Count occurrences of target shift code in the last 7 days before the target date
export function getRecencyCount(
  candidateId: string,
  date: string,
  targetShiftCode: string,
  allShifts: Shift[]
): number {
  const targetDate = new Date(date);
  const targetCode = targetShiftCode.toUpperCase();

  return allShifts.filter(s => {
    if (s.staff_id !== candidateId || s.shift_code.toUpperCase() !== targetCode) {
      return false;
    }
    const sDate = new Date(s.date);
    const diffTime = targetDate.getTime() - sDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 7;
  }).length;
}

/**
 * Computes scores and ranks for eligible candidates.
 */
export function scoreCandidates(
  eligibleCandidates: Staff[],
  targetDate: string,
  targetShiftCode: string,
  targetGroup: 'CNS' | 'ESS',
  targetSubGroup: string,
  allShifts: Shift[]
): CandidateRecommendation[] {
  if (eligibleCandidates.length === 0) return [];

  // 1. Gather workload, rest buffer, and recency counts for normalization
  const candidateStats = eligibleCandidates.map(c => {
    const workload = getWorkloadCount(c.id, allShifts);
    const restBuffer = getMinRestBuffer(c.id, targetDate, targetShiftCode, targetGroup, allShifts);
    const recencyCount = getRecencyCount(c.id, targetDate, targetShiftCode, allShifts);
    return {
      candidateId: c.id,
      workload,
      restBuffer,
      recencyCount
    };
  });

  const workloads = candidateStats.map(s => s.workload);
  const restBuffers = candidateStats.map(s => s.restBuffer);

  const minWorkload = Math.min(...workloads);
  const maxWorkload = Math.max(...workloads);
  
  const minRest = Math.min(...restBuffers);
  const maxRest = Math.max(...restBuffers);

  // 2. Compute MCDA score for each candidate
  const recommendations: CandidateRecommendation[] = eligibleCandidates.map(c => {
    const stats = candidateStats.find(s => s.candidateId === c.id)!;

    // --- Factor 1: RatingCoverageScore (Weight: 0.35) ---
    // Favor candidates who hold FEWER total ratings to protect rare-rating holders.
    const numRatingsHeld = c.ratings ? c.ratings.length : 1;
    const ratingCoverageRaw = 1.0 / numRatingsHeld; // Smaller ratings count = higher raw score

    // --- Factor 2: WorkloadBalanceScore (Weight: 0.25) ---
    // Favor candidates with lower workloads so far.
    let workloadRaw = 1.0;
    if (maxWorkload !== minWorkload) {
      workloadRaw = (maxWorkload - stats.workload) / (maxWorkload - minWorkload);
    }

    // --- Factor 3: FatigueMarginScore (Weight: 0.20) ---
    // Favor candidates with larger rest periods.
    let fatigueRaw = 1.0;
    if (maxRest !== minRest) {
      fatigueRaw = (stats.restBuffer - minRest) / (maxRest - minRest);
    }

    // --- Factor 4: RecencyOfSameShiftScore (Weight: 0.10) ---
    // Prevent repetition of night shifts.
    const recencyRaw = 1.0 / (1.0 + stats.recencyCount);

    // --- Factor 5: GroupContinuityScore (Weight: 0.10) ---
    // Slight preference for same subgroup.
    const groupRaw = c.sub_group === targetSubGroup ? 1.0 : 0.0;

    // Weighted scores
    const wRating = ratingCoverageRaw * 0.35;
    const wWorkload = workloadRaw * 0.25;
    const wFatigue = fatigueRaw * 0.20;
    const wRecency = recencyRaw * 0.10;
    const wGroup = groupRaw * 0.10;

    const finalScore = parseFloat((wRating + wWorkload + wFatigue + wRecency + wGroup).toFixed(4));

    const breakdown: ScoreBreakdown = {
      ratingCoverage: parseFloat(wRating.toFixed(4)),
      workloadBalance: parseFloat(wWorkload.toFixed(4)),
      fatigueMargin: parseFloat(wFatigue.toFixed(4)),
      recencyOfSameShift: parseFloat(wRecency.toFixed(4)),
      groupContinuity: parseFloat(wGroup.toFixed(4)),
      rawScores: {
        ratingCoverage: parseFloat(ratingCoverageRaw.toFixed(4)),
        workloadBalance: parseFloat(workloadRaw.toFixed(4)),
        fatigueMargin: parseFloat(fatigueRaw.toFixed(4)),
        recencyOfSameShift: parseFloat(recencyRaw.toFixed(4)),
        groupContinuity: parseFloat(groupRaw.toFixed(4))
      }
    };

    return {
      staff_id: c.id,
      name: c.name,
      score: finalScore,
      rank: 1, // Will be updated during sorting
      breakdown
    };
  });

  // Sort by final score descending
  recommendations.sort((a, b) => b.score - a.score);

  // Assign ranks
  for (let idx = 0; idx < recommendations.length; idx++) {
    recommendations[idx].rank = idx + 1;
  }

  return recommendations;
}
