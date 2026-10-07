import { Staff, Shift, ScoreBreakdown, CandidateRecommendation } from './types';
import { getShiftHours, getDaysDiff } from './filters';
import { calculateStaffMonthlyHours } from '../labor-rules/hours';
import { LABOR_RULES } from '../labor-rules/config';

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
  const targetCode = targetShiftCode.toUpperCase();

  return allShifts.filter(s => {
    if (s.staff_id !== candidateId || s.shift_code.toUpperCase() !== targetCode) {
      return false;
    }
    const diffDays = getDaysDiff(s.date, date);
    return diffDays > 0 && diffDays <= 7;
  }).length;
}

/**
 * Computes scores and ranks for eligible candidates based on exact monthly hours.
 * Prioritizes candidates whose resulting hours remain <= 160h.
 * If all available candidates exceed 160h, selects the candidate with the fewest hours.
 */
export function scoreCandidates(
  eligibleCandidates: Staff[],
  targetDate: string,
  targetShiftCode: string,
  targetGroup: 'CNS' | 'ESS',
  targetSubGroup: string,
  allShifts: Shift[],
  isFallback: boolean = false,
  fallbackReason: string = ''
): CandidateRecommendation[] {
  if (eligibleCandidates.length === 0) return [];

  const [tYear, tMonth] = targetDate.split('-').map(Number);
  const targetDuration = getShiftHours(targetShiftCode, targetGroup)?.start !== undefined
    ? ((getShiftHours(targetShiftCode, targetGroup)?.end || 0) - (getShiftHours(targetShiftCode, targetGroup)?.start || 0))
    : 0;

  // 1. Gather monthly hours, rest buffer, and recency counts
  const candidateStats = eligibleCandidates.map(c => {
    const candidateShifts = allShifts.filter(s => s.staff_id === c.id);
    const monthlyStats = calculateStaffMonthlyHours(candidateShifts, targetGroup, tYear, tMonth);
    const monthlyHoursBefore = monthlyStats.totalHours;
    const monthlyHoursAfter = monthlyHoursBefore + targetDuration;
    const overMonthlyLimit = monthlyHoursAfter > LABOR_RULES.monthlyHourLimit;
    const excessHours = overMonthlyLimit ? monthlyHoursAfter - LABOR_RULES.monthlyHourLimit : 0;

    const restBuffer = getMinRestBuffer(c.id, targetDate, targetShiftCode, targetGroup, allShifts);
    const recencyCount = getRecencyCount(c.id, targetDate, targetShiftCode, allShifts);

    return {
      candidate: c,
      monthlyHoursBefore,
      monthlyHoursAfter,
      overMonthlyLimit,
      excessHours,
      restBuffer,
      recencyCount
    };
  });

  const restBuffers = candidateStats.map(s => s.restBuffer);
  const minRest = Math.min(...restBuffers);
  const maxRest = Math.max(...restBuffers);

  // 2. Compute MCDA score for each candidate
  const recommendations: CandidateRecommendation[] = candidateStats.map(stat => {
    const c = stat.candidate;

    // --- Factor 1: RatingCoverageScore (Weight: 0.35) ---
    const isEss = c.group === 'ESS' || c.sub_group?.startsWith('ESS');
    const numRatingsHeld = c.ratings && c.ratings.length > 0 ? c.ratings.length : 1;
    const ratingCoverageRaw = isEss ? 1.0 : (1.0 / numRatingsHeld);

    // --- Factor 2: WorkloadBalanceScore / Monthly Headroom (Weight: 0.25) ---
    // Favor candidates with more headroom under 160h
    const headroom = Math.max(0, LABOR_RULES.monthlyHourLimit - stat.monthlyHoursAfter);
    const workloadRaw = Math.min(1.0, headroom / LABOR_RULES.monthlyHourLimit);

    // --- Factor 3: FatigueMarginScore (Weight: 0.20) ---
    let fatigueRaw = 1.0;
    if (maxRest !== minRest) {
      fatigueRaw = (stat.restBuffer - minRest) / (maxRest - minRest);
    }

    // --- Factor 4: RecencyOfSameShiftScore (Weight: 0.10) ---
    const recencyRaw = 1.0 / (1.0 + stat.recencyCount);

    // --- Factor 5: GroupContinuityScore (Weight: 0.10) ---
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
      rank: 1, // updated after two-tier sort
      breakdown,
      monthlyHoursBefore: stat.monthlyHoursBefore,
      monthlyHoursAfter: stat.monthlyHoursAfter,
      monthlyLimit: LABOR_RULES.monthlyHourLimit,
      over_monthly_limit: stat.overMonthlyLimit,
      excessHours: stat.excessHours,
      ...(isFallback ? { is_fallback: true, fallback_reason: fallbackReason } : {})
    };
  });

  // 3. Two-Tier Soft Limit Sorting:
  // Tier A: Candidates who remain <= 160h (sorted by MCDA score descending)
  // Tier B: Candidates who exceed 160h (sorted by fewest hoursAfter ascending, then MCDA score descending)
  recommendations.sort((a, b) => {
    const aOver = a.over_monthly_limit ?? false;
    const bOver = b.over_monthly_limit ?? false;

    if (!aOver && bOver) return -1; // Under-limit always comes first
    if (aOver && !bOver) return 1;

    if (aOver && bOver) {
      // Both exceed limit: pick the one with lowest total hours (least excess)
      const hoursDiff = (a.monthlyHoursAfter || 0) - (b.monthlyHoursAfter || 0);
      if (hoursDiff !== 0) return hoursDiff;
      return b.score - a.score;
    }

    // Both under limit: standard MCDA score descending
    return b.score - a.score;
  });

  // Assign ranks
  for (let idx = 0; idx < recommendations.length; idx++) {
    recommendations[idx].rank = idx + 1;
  }

  return recommendations;
}

